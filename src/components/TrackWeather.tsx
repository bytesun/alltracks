import React from 'react';
import { TrackPoint } from '../utils/exportFormats';

interface WeatherData {
  temperature: number;
  conditions: string;
  windSpeed: number;
  humidity: number;
}

interface TrackWeatherProps {
  trackPoints: TrackPoint[];
  weatherData: WeatherData[];
}

export const TrackWeather: React.FC<TrackWeatherProps> = ({
  trackPoints,
  weatherData
}) => {
  return (
    <div className="weather-display">
      <div className="weather-header">
        <h3>Weather Conditions</h3>
        <span className="material-icons">thermostat</span>
      </div>
      <div className="weather-grid">
        {weatherData.map((data, index) => (
          <div key={index} className="weather-point">
            <div className="weather-time">
              {new Date(trackPoints[index].timestamp).toLocaleTimeString()}
            </div>
            <div className="weather-temp">{data.temperature}°C</div>
            <div className="weather-wind">{data.windSpeed} km/h</div>
            <div className="weather-humidity">{data.humidity}%</div>
          </div>
        ))}
      </div>
    </div>
  );
};
