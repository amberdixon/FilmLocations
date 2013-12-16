from flask import Flask, jsonify
from flask.ext.pymongo import PyMongo

app = Flask(__name__)
mongo = PyMongo(app) # assumes default db name = app name

@app.route("/crawlMovieData")
def crawlMovieData():
  return jsonify(status='ok')


if __name__ == "__main__":
  app.run(debug = True)