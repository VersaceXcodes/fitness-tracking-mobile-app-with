import React, { useState, useEffect } from 'react';
import { StyleSheet, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';

import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Fonts } from '@/constants/theme';
import { apiService } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

interface Property {
  property_id: string;
  title: string;
  description: string;
  property_type: string;
  address: string;
  city: string;
  country: string;
  price_per_night: number;
  guest_capacity: number;
  bedroom_count: number;
  bathroom_count: number;
  rating?: number;
  review_count?: number;
  photos?: Array<{
    photo_id: string;
    photo_url: string;
    is_primary: boolean;
  }>;
}

export default function TabTwoScreen() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated } = useAuth();

  const loadProperties = async () => {
    try {
      setError(null);
      const response = await apiService.getProperties({
        limit: 20,
        offset: 0
      });
      
      if (response.data) {
        setProperties(response.data);
      }
    } catch (err) {
      console.error('Failed to load properties:', err);
      setError('Failed to load properties. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadProperties();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadProperties();
  };

  const renderPropertyCard = (property: Property) => {
    const primaryPhoto = property.photos?.find(photo => photo.is_primary) || property.photos?.[0];
    
    return (
      <TouchableOpacity key={property.property_id} style={styles.propertyCard}>
        {primaryPhoto ? (
          <Image
            source={{ uri: primaryPhoto.photo_url }}
            style={styles.propertyImage}
            contentFit="cover"
          />
        ) : (
          <ThemedView style={styles.propertyImagePlaceholder}>
            <IconSymbol name="house.fill" size={40} color="#808080" />
          </ThemedView>
        )}
        
        <ThemedView style={styles.propertyInfo}>
          <ThemedText type="defaultSemiBold" style={styles.propertyTitle}>
            {property.title}
          </ThemedText>
          <ThemedText style={styles.propertyLocation}>
            {property.city}, {property.country}
          </ThemedText>
          <ThemedText style={styles.propertyDetails}>
            {property.guest_capacity} guests · {property.bedroom_count} bedrooms · {property.bathroom_count} bathrooms
          </ThemedText>
          <ThemedView style={styles.propertyFooter}>
            <ThemedText type="defaultSemiBold" style={styles.propertyPrice}>
              ${property.price_per_night} per night
            </ThemedText>
            {property.rating && (
              <ThemedView style={styles.ratingContainer}>
                <IconSymbol name="star.fill" size={14} color="#FFD700" />
                <ThemedText style={styles.ratingText}>
                  {property.rating.toFixed(1)} ({property.review_count || 0})
                </ThemedText>
              </ThemedView>
            )}
          </ThemedView>
        </ThemedView>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <ParallaxScrollView
        headerBackgroundColor={{ light: '#D0D0D0', dark: '#353636' }}
        headerImage={
          <IconSymbol
            size={310}
            color="#808080"
            name="magnifyingglass"
            style={styles.headerImage}
          />
        }>
        <ThemedView style={styles.titleContainer}>
          <ThemedText
            type="title"
            style={{
              fontFamily: Fonts.rounded,
            }}>
            Explore Properties
          </ThemedText>
        </ThemedView>
        <ThemedView style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <ThemedText style={styles.loadingText}>Loading properties...</ThemedText>
        </ThemedView>
      </ParallaxScrollView>
    );
  }

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#D0D0D0', dark: '#353636' }}
      headerImage={
        <IconSymbol
          size={310}
          color="#808080"
          name="magnifyingglass"
          style={styles.headerImage}
        />
      }
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }>
      <ThemedView style={styles.titleContainer}>
        <ThemedText
          type="title"
          style={{
            fontFamily: Fonts.rounded,
          }}>
          Explore Properties
        </ThemedText>
        <ThemedText style={styles.subtitle}>
          Discover amazing places to stay
        </ThemedText>
      </ThemedView>

      {error && (
        <ThemedView style={styles.errorContainer}>
          <ThemedText style={styles.errorText}>{error}</ThemedText>
          <TouchableOpacity style={styles.retryButton} onPress={loadProperties}>
            <ThemedText style={styles.retryButtonText}>Retry</ThemedText>
          </TouchableOpacity>
        </ThemedView>
      )}

      {properties.length === 0 && !error ? (
        <ThemedView style={styles.emptyContainer}>
          <IconSymbol name="house" size={60} color="#808080" />
          <ThemedText style={styles.emptyText}>
            No properties found. Check back later!
          </ThemedText>
        </ThemedView>
      ) : (
        <ThemedView style={styles.propertiesContainer}>
          {properties.map(renderPropertyCard)}
        </ThemedView>
      )}
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  headerImage: {
    color: '#808080',
    bottom: -90,
    left: -35,
    position: 'absolute',
  },
  titleContainer: {
    flexDirection: 'column',
    gap: 8,
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    backgroundColor: '#FFE6E6',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  errorText: {
    color: '#D32F2F',
    marginBottom: 8,
  },
  retryButton: {
    backgroundColor: '#D32F2F',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  retryButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  propertiesContainer: {
    gap: 16,
  },
  propertyCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  propertyImage: {
    width: '100%',
    height: 200,
  },
  propertyImagePlaceholder: {
    width: '100%',
    height: 200,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  propertyInfo: {
    padding: 16,
  },
  propertyTitle: {
    fontSize: 18,
    marginBottom: 4,
  },
  propertyLocation: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  propertyDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  propertyFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  propertyPrice: {
    fontSize: 16,
    color: '#007AFF',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    color: '#666',
  },
});
