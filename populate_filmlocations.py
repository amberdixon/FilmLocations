import requests
import re
import time
import pymongo
from pymongo import MongoClient

FILM_LOCATION_RESOURCE_URL = "http://data.sfgov.org/resource/yitu-d5am.json"

def crawl_and_geocode():
  """1. Read the locations from the sfgov database.
     2. Geocode addresses into lat-lng pairs.
     3. Save in Mongo.
  """
  resp = requests.get(FILM_LOCATION_RESOURCE_URL,
                      params = {"$where": "locations IS NOT NULL"})
  if resp.status_code != 200:
    raise BaseException("Movie data request failed: %d" % r.status_code)
  movieData = resp.json()

  # find SF region bounds
  r = requests.get("http://maps.googleapis.com/maps/api/geocode/json?address=san+francisco&sensor=false")
  cityData = r.json()
  if r.status_code != 200 or cityData.get('status') != 'OK':
    raise BaseException("City data request failed: %d %s" % (r.status_code, (cityData.get('status') or 'None')))

  boundsData = cityData['results'][0]['geometry']['bounds']
  firstTwoBounds = boundsData.values()[0:2]
  firstTwoBounds.reverse() # put southwest bound first
  boundsParam = '|'.join(['%f,%f' % (b['lat'], b['lng']) for b in firstTwoBounds])

  dbclient = MongoClient()
  db = dbclient.filmlocations
  # for i in range(0,100):
  for i in range(0, len(movieData)):
    locAddress = movieData[i]['locations']
    addressData = getAddressData(locAddress, boundsParam)
    if not addressData:
      continue
    firstSfAddress = findFirstSfAddress(addressData, firstTwoBounds[0], firstTwoBounds[1])
    # sometimes the address is formatted as such: "Coit Tower (123 Broadway St.)", find subaddresses in parens
    if not firstSfAddress:
      subAddresses = re.findall('\((.*)\)', locAddress)
      for subAddr in subAddresses:
        addressData = getAddressData(subAddr, boundsParam)
        if not addressData:
          continue
        # find addresses within SF region only
        firstSfAddress = findFirstSfAddress(addressData, firstTwoBounds[0], firstTwoBounds[1])
        if firstSfAddress:
          break
    if not firstSfAddress:
      print "No SF geocoding data found for address %s" % locAddress
      continue
    addressData = firstSfAddress['geometry']['location']
    movieData[i]['lngLat'] = [addressData['lng'], addressData['lat']]
    newobj = db.filmlocations.insert(movieData[i])
    if newobj is None:
      print "Warning: DB Insert of movieData %s failed" % movieData[i]['title']
  db.filmlocations.create_index([('lngLat', pymongo.GEO2D)])
  db.filmlocations.create_index([('title', pymongo.ASCENDING)])

def getAddressData(addr, boundsParam):
  url = "http://maps.googleapis.com/maps/api/geocode/json"
  params = {'address': addr + ", San Francisco", 'sensor': 'false', 'bounds': boundsParam}
  resp = requests.get(url, params=params)
  addressData = resp.json()
  if resp.status_code != 200 or addressData.get('status') != 'OK':
    # http://stackoverflow.com/questions/17843536/google-geocoding-api-error-over-query-limit
    if addressData.get('status') == 'OVER_QUERY_LIMIT':
      time.sleep(2)
      resp = requests.get(url, params=params)
      addressData = resp.json()
    if resp.status_code != 200 or addressData.get('status') != 'OK':
      print "Address data request failed: %s %d %s" % (addr, resp.status_code, (addressData.get('status') or 'None'))
      return None
  return addressData

def findFirstSfAddress(geocodingResults, sfSouthwestBound, sfNorthEastBound):
  firstSfAddress = None
  for ad in geocodingResults['results']:
    coords = ad['geometry']['location']
    if sfSouthwestBound['lat'] - .5 <= coords['lat'] <= sfNorthEastBound['lat'] + .5 and \
       sfSouthwestBound['lng'] - .5 <= coords['lng'] <= sfNorthEastBound['lng'] + .5:
       firstSfAddress = ad
       break
  return firstSfAddress


crawl_and_geocode()