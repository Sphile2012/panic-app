import * as Location from 'expo-location';

export async function resolveStreetAddress(latitude: number, longitude: number): Promise<string | null> {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  try {
    const addresses = await Promise.race([
      Location.reverseGeocodeAsync({ latitude, longitude }),
      new Promise<Location.LocationGeocodedAddress[]>((_, reject) => {
        timeout = setTimeout(() => reject(new Error('Street address lookup timed out.')), 5000);
      }),
    ]);
    const [address] = addresses;
    if (!address) return null;
    if (address.formattedAddress?.trim()) return address.formattedAddress.trim();

    const street = [address.streetNumber, address.street].filter(Boolean).join(' ').trim();
    const parts = [
      street,
      address.district,
      address.city,
      address.subregion,
      address.region,
      address.postalCode,
      address.country,
    ].filter((part): part is string => Boolean(part?.trim()));
    const uniqueParts = [...new Set(parts)];
    if (uniqueParts.length > 0) return uniqueParts.join(', ');
    return address.name?.trim() || null;
  } catch (error) {
    console.warn('Could not resolve the GPS position to a street address.', error);
    return null;
  } finally {
    if (timeout !== null) clearTimeout(timeout);
  }
}
