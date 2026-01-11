from flask import Flask, render_template, jsonify, request
import requests
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
API_KEY = os.getenv("OPENWEATHER_API_KEY")

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/air-quality')
def get_air_quality():
    city = request.args.get('city')
    if not city:
        return jsonify({"error": "City parameter is required"}), 400

    # 1. Geocoding to get lat/lon
    geo_url = f"http://api.openweathermap.org/geo/1.0/direct?q={city},TR&limit=1&appid={API_KEY}"
    
    try:
        geo_response = requests.get(geo_url)
        geo_data = geo_response.json()
        
        if not geo_data:
            return jsonify({"error": "City not found"}), 404
            
        lat = geo_data[0]['lat']
        lon = geo_data[0]['lon']
        
        # 2. Get Air Pollution Data
        pollution_url = f"http://api.openweathermap.org/data/2.5/air_pollution?lat={lat}&lon={lon}&appid={API_KEY}"
        pollution_response = requests.get(pollution_url)
        pollution_data = pollution_response.json()

        # 3. Get Current Weather Data
        weather_url = f"http://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&units=metric&lang=tr&appid={API_KEY}"
        weather_response = requests.get(weather_url)
        weather_data = weather_response.json()

        # 4. Get 5-Day Forecast
        forecast_url = f"http://api.openweathermap.org/data/2.5/forecast?lat={lat}&lon={lon}&units=metric&lang=tr&appid={API_KEY}"
        forecast_response = requests.get(forecast_url)
        forecast_data = forecast_response.json()
        
        return jsonify({
            "pollution": pollution_data,
            "weather": weather_data,
            "forecast": forecast_data
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/reverse-geocode')
def reverse_geocode():
    lat = request.args.get('lat')
    lon = request.args.get('lon')
    
    if not lat or not lon:
        return jsonify({"error": "Lat/Lon required"}), 400
        
    url = f"http://api.openweathermap.org/geo/1.0/reverse?lat={lat}&lon={lon}&limit=1&appid={API_KEY}"
    
    try:
        response = requests.get(url)
        data = response.json()
        if data:
            return jsonify({"city": data[0]['name']})
        else:
            return jsonify({"error": "City not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/tiles/<layer>/<z>/<x>/<y>')
def get_map_tile(layer, z, x, y):
    # Proxy for OWM Tiles to hide API Key
    # layer examples: clouds_new, precipitation_new, pressure_new, wind_new, temp_new
    url = f"https://tile.openweathermap.org/map/{layer}/{z}/{x}/{y}.png?appid={API_KEY}"
    try:
        resp = requests.get(url, stream=True)
        if resp.status_code == 200:
            return resp.content, 200, {'Content-Type': 'image/png'}
        return "Tile Error", resp.status_code
    except Exception as e:
        return str(e), 500

if __name__ == '__main__':
    app.run(debug=True)
