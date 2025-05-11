// google-map.directive.ts
import {
    Directive,
    ElementRef,
    Input,
    OnChanges,
    OnInit,
    SimpleChanges,
    Inject,
} from '@angular/core';
import { GoogleMapsService } from '../services/google-map.service';

@Directive({
    selector: '[appGoogleMap]',
})
export class GoogleMapDirective implements OnInit, OnChanges {
    @Input() postcode = 'M201AQ';
    @Input() zoom = 15;

    private map: any;
    private marker: any;

    constructor(
        private el: ElementRef,
        @Inject(GoogleMapsService) private mapsService: GoogleMapsService
    ) {}

    async ngOnInit() {
        if (this.postcode) {
            try {
                const result = await this.mapsService.createMap(
                    this.el.nativeElement.id,
                    this.postcode,
                    this.zoom
                );
                this.map = result.map;
                this.marker = result.marker;
            } catch (error) {
                console.error('Failed to initialize map:', error);
            }
        }
    }

    async ngOnChanges(changes: SimpleChanges) {
        // Only update if map already exists and postcode or zoom changed
        if (this.map && (changes['postcode'] || changes['zoom'])) {
            try {
                const result = await this.mapsService.updateMap(
                    this.map,
                    this.marker,
                    this.postcode,
                    changes['zoom'] ? this.zoom : undefined
                );
            } catch (error) {
                console.error('Failed to update map:', error);
            }
        }
    }
}
