export const MAX_SHARE_ACCURACY_METERS = 50;

export function hasValidCoordinates(latitude, longitude) {
  return Number.isFinite(latitude) &&
    latitude >= -90 && latitude <= 90 &&
    Number.isFinite(longitude) &&
    longitude >= -180 && longitude <= 180;
}

export function isShareableAccuracy(accuracy) {
  return Number.isFinite(accuracy) &&
    accuracy > 0 &&
    accuracy <= MAX_SHARE_ACCURACY_METERS;
}
