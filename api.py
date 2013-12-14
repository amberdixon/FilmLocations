from flask import Flask, jsonify
import requests
import json
import re
app = Flask(__name__)

@app.route("/")
def getMovieData():
  resp = requests.get("http://data.sfgov.org/resource/yitu-d5am.json",
                      params = {"$select": "locations,title,fun_facts,release_year,production_company",
                                "$where": "locations IS NOT NULL"})
  if resp.status_code != 200:
    errMsg = 'Movie data request failed: ' + r.status_code
    app.logger.error(errMsg)
    return (errMsg, 500)
  movieData = resp.json()

  # find SF region bounds
  r = requests.get("http://maps.googleapis.com/maps/api/geocode/json?address=san+francisco&sensor=false")
  cityData = r.json()
  if r.status_code != 200 or cityData.get('status') != 'OK':
    errMsg = 'City data request failed: ' + r.status_code + ' ' + (cityData.get('status') or 'None')
    app.logger.error(errMsg)
    return (errMsg, 500)

  boundsData = cityData['results'][0]['geometry']['bounds']
  firstTwoBounds = boundsData.values()[0:2]
  firstTwoBounds.reverse() # put southwest bound first
  boundsParam = '|'.join(['%f,%f' % (b['lat'], b['lng']) for b in firstTwoBounds])
  for i in range(0,10):
    locAddress = movieData[i]['locations']
    addressData = requests.get("http://maps.googleapis.com/maps/api/geocode/json",
                               params = {'address': locAddress, 'sensor': 'false', 'bounds': boundsParam}).json()
    firstSfAddress = findFirstSfAddress(addressData, firstTwoBounds[0], firstTwoBounds[1])
    # sometimes the address is formatted as such: "Coit Tower (123 Broadway St.)"
    if not firstSfAddress:
      subAddresses = re.findall('\((.*)\)', locAddress)
      for subAddr in subAddresses:
        addressData = requests.get("http://maps.googleapis.com/maps/api/geocode/json",
                                   params = {'address': subAddr, 'sensor': 'false', 'bounds': boundsParam}).json()
        firstSfAddress = findFirstSfAddress(addressData, firstTwoBounds[0], firstTwoBounds[1])
        if firstSfAddress:
          break
    if not firstSfAddress:
      app.logger.warning('No SF geocoding data found for address ' + locAddress)
      continue
    addressData = firstSfAddress['geometry']['location']
    movieData[i]['latLng'] = addressData

  return jsonify(message=movieData)

def findFirstSfAddress(geocodingResults, sfSouthwestBound, sfNorthEastBound):
  firstSfAddress = None
  for ad in geocodingResults['results']:
    coords = ad['geometry']['location']
    if sfSouthwestBound['lat'] <= coords['lat'] <= sfNorthEastBound['lat'] and \
       sfSouthwestBound['lng'] <= coords['lng'] <= sfNorthEastBound['lng']:
       firstSfAddress = ad
       break
  return firstSfAddress

if __name__ == "__main__":
  app.run(debug = True)