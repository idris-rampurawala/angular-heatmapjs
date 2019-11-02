import { Component, OnInit, Renderer2 } from '@angular/core';

declare let h337: any;

const MOUSE_CIRCLE_RADIUS = 25;
const MOUSE_CIRCLE_TRANSL_RADIUS = 10;
const HEATMAP_HEIGHT = 400;
const HEATMAP_WIDTH = 225;
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  gradientCfg = {
    '0.15': '#6ad180', // green
    '0.25': '#7cd573',
    '0.35': '#90d865',
    '0.45': '#a4da57',
    '0.55': '#badc48',
    '0.65': '#c9cf35',
    '0.75': '#d6c226',
    '0.80': '#e2b41c',
    '0.85': '#e2961d',
    '0.90': '#dd7826',
    '0.95': '#d25c30',
    '1.0': '#c24039' // highest red
  };
  heatmap: any = null;
  coordinates: Array<Coordinate> = []
  heatmapContainer: HTMLElement;
  tooltip: HTMLElement;
  isMouseInsideHeatmap = false;
  mouseCircle: HTMLElement;
  xMinCoord: number;
  yMinCoord: number;
  xMaxCoord: number;
  yMaxCoord: number;

  constructor(private renderer: Renderer2) {  }

  ngOnInit(): void {
    this.generateCoordinates();
    this.calculateMinMaxCoord();
    const heatmapConfig = {
      container: document.querySelector('#heatmapContainer'),
      opacity: .8,
      radius: 7,
      visible: true,
      gradient: this.gradientCfg,
      backgroundColor: 'inherit'
    };
    this.heatmap = h337.create(heatmapConfig);
    this.heatmap.setData({ max: 30, data: this.coordinates });

    this.heatmapContainer = document.querySelector('#heatmapContainer');
    this.tooltip = this.renderer.createElement('div');
    this.renderer.addClass(this.tooltip, 'heatmap-tooltip');
    this.renderer.setStyle(this.tooltip, 'display', 'none');
    this.renderer.setStyle(this.tooltip, 'transform', 'translate(39px, 489px)');
    this.mouseCircle = this.renderer.createElement('div');
    this.renderer.addClass(this.mouseCircle, 'mouseCircle');
    this.renderer.setStyle(this.mouseCircle, 'display', 'none');
    this.renderer.setStyle(this.mouseCircle, 'transform', 'translate(39px, 489px)');
    this.renderer.appendChild(this.heatmapContainer, this.tooltip);
    this.renderer.appendChild(this.heatmapContainer, this.mouseCircle);
  }

  generateCoordinates(): void {
    const extremas = [(Math.random() * 1000) >> 0, (Math.random() * 1000) >> 0];
    const max = Math.max.apply(Math, extremas);
    const min = Math.min.apply(Math, extremas);
    for (let i = 0; i < 1000; i++) {
      const x = (Math.random() * HEATMAP_WIDTH) >> 0;
      const y = (Math.random() * HEATMAP_HEIGHT) >> 0;
      const c = ((Math.random() * max - min) >> 0) + min;
      // add to dataset
      this.coordinates.push({ x: x, y: y, value: c });
    }
  }

  // heatmap tooltip
  updateTooltip(x: number, y: number) {
    const transl = 'translate(' + (x + MOUSE_CIRCLE_TRANSL_RADIUS) + 'px, ' + (y + MOUSE_CIRCLE_TRANSL_RADIUS) + 'px)';
    this.renderer.setStyle(this.tooltip, 'transform', transl)
    this.renderer.setProperty(this.tooltip, 'innerText', 'Click to get the coordinates inside the circle');
    // mouse circle code
    const itemRect = this.mouseCircle.getBoundingClientRect();
    const xPos = x - itemRect.width / 2;
    const yPos = y - itemRect.height / 2;
    this.renderer.setStyle(this.mouseCircle, 'transform', 'translate3d(' + xPos + 'px, ' + yPos + 'px, 0)');
  }

  heatmapMouseMove(ev: any): void {
    if (!this.isMouseInsideHeatmap) {
      return;
    }
    const x = ev.layerX;
    const y = ev.layerY;
    // if going out of the heatmap container then exit
    if (x < 0 || y < 0 || x > HEATMAP_WIDTH || y > HEATMAP_HEIGHT) {
      this.heatmapMouseOut();
      return;
    }
    this.renderer.setStyle(this.tooltip, 'display', 'block');
    this.renderer.setStyle(this.mouseCircle, 'display', 'block');
    this.updateTooltip(x, y);
  }

  heatmapMouseOut(): void {
    this.isMouseInsideHeatmap = false;
    this.renderer.setStyle(this.tooltip, 'display', 'none');
    this.renderer.setStyle(this.mouseCircle, 'display', 'none');
  }

  heatmapMouseEnter(): void {
    this.isMouseInsideHeatmap = true;
  }

  mouseCircleClick(evt: any) {
    const radiusSquared = MOUSE_CIRCLE_RADIUS * MOUSE_CIRCLE_RADIUS;
    const circlePositionsXY = new Set<string>();
    const xcord = evt.layerX;
    const ycord = evt.layerY;
    const xExtreme = xcord + MOUSE_CIRCLE_RADIUS;
    const yExtreme = ycord + MOUSE_CIRCLE_RADIUS;

    // finding all positions around this circle
    for (let x = this.xMinCoord; x <= Math.min(xExtreme, this.xMaxCoord); x++) {
      for (let y = this.yMinCoord; y <= Math.min(yExtreme, this.yMaxCoord); y++) {
        const dx = x - xcord;
        const dy = y - ycord;
        const distanceSquared = dx * dx + dy * dy;

        if (distanceSquared <= radiusSquared) {
          circlePositionsXY.add(`${x}${y}`);
        }
      }
    }
    console.log(this.fetchXYPositionTaskList(circlePositionsXY));
  }

  fetchXYPositionTaskList(circlePositionsXY: Set<string>): Array<Coordinate> {
    const selectedCoods = [];
    for (let i = 0; i < this.coordinates.length; i++) {
      const currElement = this.coordinates[i];
      if (circlePositionsXY.has(`${currElement['x']}${currElement['y']}`)) {
        selectedCoods.push({
          x: currElement['x'],
          y: currElement['y'],
          value: currElement['value']
        });
      }
    }
    return selectedCoods;
  }

  calculateMinMaxCoord() {
    if (!this.coordinates.length) {
      return;
    }
    this.xMinCoord = this.coordinates[0]['x'];
    this.xMaxCoord = 0;
    this.yMinCoord = this.coordinates[0]['y'];
    this.yMaxCoord = 0;
    this.coordinates.forEach(element => {
      if (element['x'] < this.xMinCoord) {
        this.xMinCoord = element['x'];
      }
      if (element['y'] < this.yMinCoord) {
        this.yMinCoord = element['y'];
      }
      if (element['x'] > this.xMaxCoord) {
        this.xMaxCoord = element['x'];
      }
      if (element['y'] > this.yMaxCoord) {
        this.yMaxCoord = element['y'];
      }
    });
  }

}

export interface Coordinate {
  x: number;
  y: number;
  value: number;
}
