import 'index.dart'; // Imports other custom widgets

import 'package:google_maps_flutter/google_maps_flutter.dart' hide LatLng;
import 'package:google_maps_flutter/google_maps_flutter.dart' as gmaps;

import 'package:flutter_polyline_points/flutter_polyline_points.dart';

import 'package:google_routes_flutter/google_routes_flutter.dart' hide LatLng;
import 'package:google_routes_flutter/google_routes_flutter.dart' as route;

class GoogleMapsRoute extends StatefulWidget {
  const GoogleMapsRoute({
    super.key,
    this.width,
    this.height,
    this.origin,
    this.destination,
    required this.googleApiKey,
    this.initialLocation,
    required this.onRouteDrawn,
    required this.onError,
    required this.onMapCreated,
    required this.routeColor,
    required this.padding,
    required this.avoidTolls,
  });

  final double? width;
  final double? height;
  final LatLng? origin;
  final LatLng? destination;
  final String googleApiKey;
  final LatLng? initialLocation;
  final Future Function(
      int? totalDistanceValue,
      int? totalDurationValue,
      String? distanceText,
      String? durationText,
      String? staticDurationText) onRouteDrawn;
  final Future Function(String? message) onError;
  final Future Function() onMapCreated;
  final Color routeColor;
  final double padding;
  final bool avoidTolls;

  @override
  State<GoogleMapsRoute> createState() => _GoogleMapsRouteState();
}

class _GoogleMapsRouteState extends State<GoogleMapsRoute> {
  late GoogleMapController _mapController;
  final Set<Marker> _markers = {};
  final Set<gmaps.Polyline> _polylines = {};
  List<gmaps.LatLng> _routePoints = [];

  gmaps.LatLng get initialPosition =>
      widget.initialLocation?.toGoogleMaps() ?? const gmaps.LatLng(0.0, 0.0);

  @override
  void initState() {
    super.initState();
    _initializeMap();
  }

  void _initializeMap() {
    if (!_isLatLngNullOrZero(widget.origin) &&
        !_isLatLngNullOrZero(widget.destination)) {
      _setMarkers();
      _fetchAndDrawRoute();
    } else if (!_isLatLngNullOrZero(widget.origin)) {
      _centerOnPosition(widget.origin);
    }
  }

  void _centerOnPosition(LatLng? position) {
    if (position != null) {
      _mapController.animateCamera(
        CameraUpdate.newLatLng(position.toGoogleMaps()),
      );
    }
  }

  void _setMarkers() {
    setState(() {
      _markers
        ..clear()
        ..addAll([
          if (widget.origin != null)
            Marker(
              markerId: const MarkerId("origin"),
              position: widget.origin!.toGoogleMaps(),
            ),
          if (widget.destination != null)
            Marker(
              markerId: const MarkerId("destination"),
              position: widget.destination!.toGoogleMaps(),
            ),
        ]);
    });
  }

  Future<void> _fetchAndDrawRoute() async {
    if (widget.origin == null || widget.destination == null) return;

    try {
      final computeRoutesResponse = await computeRoute(
        origin: _toWaypoint(widget.origin),
        destination: _toWaypoint(widget.destination),
        xGoogFieldMask: 'routes.polyline.encodedPolyline,'
            'routes.localizedValues,'
            'routes.viewport,'
            'routes.duration,routes.distanceMeters,'
        //'routes.travelAdvisory.tollInfo,routes.legs.travelAdvisory.tollInfo'
        ,
        apiKey: widget.googleApiKey,
        travelMode: route.TravelMode.drive,
        polyLineEncoding: PolylineEncoding.encodedPolyline,
        polyLineQuality: PolylineQuality.overview,
        routingPreference: RoutingPreference.trafficAware,
        computeAlternativeRoutes: false,
        routeModifiers: RouteModifiers(
          avoidTolls: widget.avoidTolls,
          //vehicleInfo: VehicleInfo(emissionType: VehicleEmissionType.diesel)
        ),
        //extraComputations: List.unmodifiable([ExtraComputation.tolls]),
      );

      if (computeRoutesResponse.routes == null ||
          computeRoutesResponse.routes!.isEmpty) {
        _markers.clear();
        _polylines.clear();
        widget.onError("No routes found");
        return;
      }

      final firstRoute = computeRoutesResponse.routes!.first;

      _processRoute(firstRoute);
    } catch (e) {
      _markers.clear();
      _polylines.clear();
      widget.onError(e.toString());
    }
  }

  route.Waypoint _toWaypoint(LatLng? latLng) {
    return route.Waypoint(
      location: route.Location(
        latLng: route.LatLng(
          latitude: latLng?.latitude ?? 0.0,
          longitude: latLng?.longitude ?? 0.0,
        ),
      ),
    );
  }

  void _processRoute(route.Route? firstRoute) {
    if (firstRoute == null) return;

    final distance = firstRoute.localizedValues?.distance?.text;
    final duration = firstRoute.localizedValues?.duration?.text;
    final staticDuration = firstRoute.localizedValues?.staticDuration?.text;
    final encodedPolyline = firstRoute.polyline?.encodedPolyline;
    final bounds = _createBounds(firstRoute.viewport);

    if (encodedPolyline != null && bounds != null) {
      _drawPolyline(encodedPolyline);
      _centerMapOnRoute(bounds);

      widget.onRouteDrawn(0, 0, distance, '$duration', '$staticDuration');
    }
  }

  LatLngBounds? _createBounds(route.Viewport? viewport) {
    final low = viewport?.low;
    final high = viewport?.high;

    if (low == null || high == null) return null;

    return LatLngBounds(
      southwest: gmaps.LatLng(low.latitude!, low.longitude!),
      northeast: gmaps.LatLng(high.latitude!, high.longitude!),
    );
  }

  void _drawPolyline(String encodedPolyline) {
    final polylinePoints = PolylinePoints();
    final result = polylinePoints.decodePolyline(encodedPolyline);

    setState(() {
      _routePoints = result
          .map((point) => gmaps.LatLng(point.latitude, point.longitude))
          .toList();
      _polylines
        ..clear()
        ..add(gmaps.Polyline(
          polylineId: const PolylineId("route"),
          points: _routePoints,
          color: widget.routeColor,
          width: 6,
        ));
    });
  }

  void _centerMapOnRoute(LatLngBounds bounds) {
    if (_routePoints.isNotEmpty) {
      _mapController.animateCamera(
        CameraUpdate.newLatLngBounds(bounds, widget.padding),
      );
    }
  }

  @override
  void didUpdateWidget(covariant GoogleMapsRoute oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.origin != oldWidget.origin ||
        widget.destination != oldWidget.destination ||
        widget.avoidTolls != oldWidget.avoidTolls) {
      _initializeMap();
    }
  }

  @override
  Widget build(BuildContext context) {
    return GoogleMap(
      onMapCreated: (controller) {
        _mapController = controller;
        widget.onMapCreated();
      },
      initialCameraPosition: CameraPosition(
        target: initialPosition,
        zoom: 12,
      ),
      markers: _markers,
      polylines: _polylines,
      zoomGesturesEnabled: false,
      zoomControlsEnabled: false,
      myLocationEnabled: false,
      compassEnabled: false,
      mapToolbarEnabled: false,
      trafficEnabled: false,
    );
  }

  bool _isLatLngNullOrZero(LatLng? point) {
    return point == null || (point.latitude == 0 && point.longitude == 0);
  }
}

extension ToGoogleMapsLatLng on LatLng {
  gmaps.LatLng toGoogleMaps() => gmaps.LatLng(latitude, longitude);
}