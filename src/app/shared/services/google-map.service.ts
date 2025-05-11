// First, create a types file for Google Maps
// google-maps-types.d.ts
declare global {
  interface Window {
    google: any;
    initMap: () => void;
  }
}

// google-maps.service.ts
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class GoogleMapsService {
  private apiKey = 'YOUR_GOOGLE_MAPS_API_KEY'; // Replace with your Google Maps API key
  private geocodingUrl = 'https://maps.googleapis.com/maps/api/geocode/json';
  private mapsLoaded = false;
  private googleMapsScript: HTMLScriptElement | null = null;

  // Monochrome map style
  private monochromeStyle = [
    { elementType: 'geometry', stylers: [{ color: '#f5f5f5' }] },
    { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#f5f5f5' }] },
    { featureType: 'administrative.land_parcel', elementType: 'labels.text.fill', stylers: [{ color: '#bdbdbd' }] },
    { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#eeeeee' }] },
    { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
    { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#e5e5e5' }] },
    { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#9e9e9e' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
    { featureType: 'road.arterial', elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
    { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#dadada' }] },
    { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
    { featureType: 'road.local', elementType: 'labels.text.fill', stylers: [{ color: '#9e9e9e' }] },
    { featureType: 'transit.line', elementType: 'geometry', stylers: [{ color: '#e5e5e5' }] },
    { featureType: 'transit.station', elementType: 'geometry', stylers: [{ color: '#eeeeee' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c9c9c9' }] },
    { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#9e9e9e' }] }
  ];

  constructor(private http: HttpClient) { }

  /**
   * Initialize Google Maps API
   */
  loadGoogleMaps(): Promise<any> {
    return new Promise((resolve, reject) => {
      if (this.mapsLoaded) {
        resolve(window.google);
        return;
      }

      // Define the callback function
      window.initMap = () => {
        this.mapsLoaded = true;
        if (window.google) {
          resolve(window.google);
        } else {
          reject(new Error('Google Maps API failed to load'));
        }
      };

      if (this.googleMapsScript === null) {
        this.googleMapsScript = document.createElement('script');
        this.googleMapsScript.src = `https://maps.googleapis.com/maps/api/js?key=${this.apiKey}&callback=initMap`;
        this.googleMapsScript.defer = true;
        this.googleMapsScript.async = true;
        this.googleMapsScript.onerror = () => {
          reject(new Error('Failed to load Google Maps script'));
        };
        document.head.appendChild(this.googleMapsScript);
      }
    });
  }

  /**
   * Geocode a UK postcode to get latitude and longitude
   * @param postcode The UK postcode to geocode
   */
  geocodePostcode(postcode: string): Observable<google.maps.LatLngLiteral | null> {
    const formattedPostcode = postcode.replace(/\s/g, ''); // Remove spaces from postcode
    const url = `${this.geocodingUrl}?address=${formattedPostcode},UK&key=${this.apiKey}`;
    
    return this.http.get(url).pipe(
      map((response: any) => {
        if (response.status === 'OK' && response.results.length > 0) {
          return response.results[0].geometry.location;
        }
        throw new Error('Unable to geocode postcode');
      }),
      catchError(error => {
        console.error('Error geocoding postcode:', error);
        return of(null);
      })
    );
  }

  /**
   * Create and render a Google Map in the specified element
   * @param elementId The ID of the HTML element to render the map in
   * @param postcode The UK postcode to center the map on
   * @param zoom The zoom level (1-20) for the map
   */
  async createMap(elementId: string, postcode: string, zoom: number = 15): Promise<any> {
    try {
      // Load Google Maps if not already loaded
      const google = await this.loadGoogleMaps();
      
      // Get location from postcode
      const location = await this.geocodePostcode(postcode).toPromise();
      
      if (!location) {
        throw new Error('Invalid postcode or unable to geocode');
      }
      
      const mapOptions: google.maps.MapOptions = {
        center: location,
        zoom: zoom,
        styles: this.monochromeStyle,
        disableDefaultUI: false,
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true
      };
      
      // Create the map
      const mapElement = document.getElementById(elementId);
      if (!mapElement) {
        throw new Error(`Element with ID '${elementId}' not found`);
      }
      
      const map = new google.maps.Map(mapElement, mapOptions);
      
      // Create a teal pin marker
      const marker = new google.maps.Marker({
        position: location,
        map: map,
        animation: google.maps.Animation.DROP,
        icon: {
          path: google.maps.SymbolPath.MARKER,
          fillColor: '#008080', // Teal color
          fillOpacity: 1,
          strokeColor: '#008080',
          strokeWeight: 2,
          scale: 10
        }
      });
      
      return { map, marker };
    } catch (error) {
      console.error('Error creating map:', error);
      throw error;
    }
  }

  /**
   * Update an existing map with a new postcode and zoom level
   * @param map The Google Map instance to update
   * @param marker The marker to update
   * @param postcode The new UK postcode to center the map on
   * @param zoom The new zoom level
   */
  async updateMap(map: google.maps.Map, marker: google.maps.Marker, postcode: string, zoom?: number): Promise<any> {
    try {
      const location = await this.geocodePostcode(postcode).toPromise();
      
      if (!location) {
        throw new Error('Invalid postcode or unable to geocode');
      }
      
      // Update map center and zoom
      map.setCenter(location);
      if (zoom !== undefined) {
        map.setZoom(zoom);
      }
      
      // Update marker position
      marker.setPosition(location);
      
      return { map, marker };
    } catch (error) {
      console.error('Error updating map:', error);
      throw error;
    }
  }
}