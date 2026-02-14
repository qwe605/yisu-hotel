declare module 'react-bmapgl' {
  import * as React from 'react';
  export interface Point { lng: number; lat: number }
  export interface MapProps {
    center?: any;
    zoom?: number;
    style?: React.CSSProperties;
    onReady?: () => void;
    onClick?: (e: any) => void;
    enableScrollWheelZoom?: boolean;
    enableDragging?: boolean;
    enableDoubleClickZoom?: boolean;
    enableRotate?: boolean;
    enableTilt?: boolean;
    heading?: number;
    tilt?: number;
    mapStyleV2?: any;
    mapType?: 'normal' | 'earth';
    maxZoom?: any;
    minZoom?: any;
    ref?: any;
    children?: React.ReactNode;
  }
  export class Map extends React.Component<MapProps> { }
  export interface MarkerProps {
    position: any;
    map?: any;
    rotation?: number;
    icon?: any;
    onClick?: () => void;
  }
  export class Marker extends React.Component<MarkerProps> { }
  export interface NavigationControlProps { map?: any }
  export class NavigationControl extends React.Component<NavigationControlProps> { }
  export interface InfoWindowProps {
    position: any;
    text?: string;
    title?: string;
    map?: any;
  }
  export class InfoWindow extends React.Component<InfoWindowProps> { }
  export function MapApiLoaderHOC(opts: { ak: string }): <P = any>(Wrapped: React.ComponentType<P>) => React.ComponentType<P>;
}
