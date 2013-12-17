from flask import Flask, jsonify, request
from flask.ext.pymongo import PyMongo
from flask import render_template
from bson.json_util import dumps
import re

app = Flask(__name__)
mongo = PyMongo(app) # assumes default db name = app name

class InvalidCoordinateError(Exception):
  pass

@app.route("/")
def showFilmLocations():
  return render_template('index.html')

@app.route("/filmlocations")
def getFilmLocations():
  centerLngLat = getLngLat(request.args.get('centerLatLng'))
  title = request.args.get('title')
  if centerLngLat is None:
    return ('Must provide valid map center location', 400)
  searchCriteria = {"lngLat": {"$near": centerLngLat}}
  if title is not None and len(title) > 0:
    searchCriteria['title'] = title
  locations = mongo.db.filmlocations.find(searchCriteria).limit(200)
  return dumps({'results': locations})

@app.route("/filmsearch")
def searchFilmTitles():
  queryStr = request.args.get('query')
  if not queryStr or len(queryStr) == 0:
    return ('Query string cannot be empty', 400)
  titles = mongo.db.filmlocations.find({'title': {"$regex": re.compile(".*" + queryStr + ".*", re.IGNORECASE)}}).distinct('title')
  return dumps({'results': titles})



def getLngLat(coords):
  if not coords:
    return None
  coordArr = coords.split(',')
  if len(coordArr) != 2:
    return None

  for l in coordArr:
    if float(l) == 0.0:
      return None

  return [float(coordArr[1]), float(coordArr[0])]

if __name__ == "__main__":
  app.run(debug = True)