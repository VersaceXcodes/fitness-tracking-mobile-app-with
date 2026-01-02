import React, { useState } from 'react';
import { Image, StyleSheet, ScrollView, View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/contexts/AuthContext';
import { useProperties } from '@/contexts/PropertiesContext';
import { LoginForm } from '@/components/LoginForm';
import { Link } from 'expo-router';

export default function HomeScreen() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { properties, loading: propertiesLoading, searchProperties } = useProperties();
  const [showLogin, setShowLogin] = useState(false);

  if (authLoading || propertiesLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <ThemedText>Loading...</ThemedText>
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.heroSection}>
          <Image
            source={require('@/assets/images/icon.png')}
            style={styles.logo}
          />
          <ThemedText type="title" style={styles.heroTitle}>
            Welcome to Libyan Stays
          </ThemedText>
          <ThemedText style={styles.heroSubtitle}>
            Discover authentic Libyan hospitality and unique accommodations across Libya
          </ThemedText>
        </View>

        {showLogin ? (
          <View style={styles.formContainer}>
            <LoginForm onSuccess={() => setShowLogin(false)} />
            <TouchableOpacity onPress={() => setShowLogin(false)} style={styles.linkButton}>
              <ThemedText style={styles.linkText}>Continue as guest</ThemedText>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.ctaContainer}>
            <TouchableOpacity style={styles.primaryButton} onPress={() => setShowLogin(true)}>
              <ThemedText style={styles.buttonText}>Sign In</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton}>
              <ThemedText style={styles.secondaryButtonText}>Explore Properties</ThemedText>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.featuresSection}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>Why Choose Libyan Stays?</ThemedText>
          <View style={styles.featureItem}>
            <ThemedText style={styles.featureTitle}>🏠 Authentic Libyan Homes</ThemedText>
            <ThemedText style={styles.featureDesc}>Stay in traditional and modern Libyan accommodations</ThemedText>
          </View>
          <View style={styles.featureItem}>
            <ThemedText style={styles.featureTitle}>🤝 Trusted Hosts</ThemedText>
            <ThemedText style={styles.featureDesc}>Verified local hosts who understand Libyan hospitality</ThemedText>
          </View>
          <View style={styles.featureItem}>
            <ThemedText style={styles.featureTitle}>🔒 Secure Booking</ThemedText>
            <ThemedText style={styles.featureDesc}>Safe and reliable booking system with local support</ThemedText>
          </View>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.welcomeSection}>
        <ThemedText type="title">Welcome back, {user?.name}!</ThemedText>
        <ThemedText style={styles.welcomeSubtitle}>
          {user?.role === 'host' ? 'Manage your properties and bookings' : 'Find your perfect Libyan stay'}
        </ThemedText>
      </View>

      <View style={styles.propertiesSection}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Featured Properties
        </ThemedText>
        {properties.length === 0 ? (
          <View style={styles.emptyState}>
            <ThemedText>No properties found.</ThemedText>
            <TouchableOpacity style={styles.primaryButton} onPress={() => searchProperties()}>
              <ThemedText style={styles.buttonText}>Refresh</ThemedText>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.propertiesList}>
            {properties.slice(0, 3).map((property) => (
              <Link key={property.property_id} href={`/property/${property.property_id}`} asChild>
                <TouchableOpacity style={styles.propertyCard}>
                  <View style={styles.propertyHeader}>
                    <ThemedText style={styles.propertyTitle}>{property.title}</ThemedText>
                    <ThemedText style={styles.propertyType}>{property.property_type}</ThemedText>
                  </View>
                  <ThemedText style={styles.propertyLocation}>{property.city}</ThemedText>
                  <ThemedText style={styles.propertyPrice}>
                    {property.base_price_per_night} {property.currency} per night
                  </ThemedText>
                  <ThemedText style={styles.propertyCapacity}>
                    {property.guest_capacity} guests • {property.bedrooms} bedrooms • {property.bathrooms} bathrooms
                  </ThemedText>
                </TouchableOpacity>
              </Link>
            ))}
          </View>
        )}
      </View>

      <View style={styles.quickActions}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>Quick Actions</ThemedText>
        <View style={styles.actionButtons}>
          {user?.role === 'host' ? (
            <>
              <Link href="/properties/new" asChild>
                <TouchableOpacity style={styles.actionButton}>
                  <ThemedText style={styles.actionButtonText}>Add Property</ThemedText>
                </TouchableOpacity>
              </Link>
              <Link href="/bookings" asChild>
                <TouchableOpacity style={styles.actionButton}>
                  <ThemedText style={styles.actionButtonText}>View Bookings</ThemedText>
                </TouchableOpacity>
              </Link>
            </>
          ) : (
            <>
              <Link href="/search" asChild>
                <TouchableOpacity style={styles.actionButton}>
                  <ThemedText style={styles.actionButtonText}>Search Properties</ThemedText>
                </TouchableOpacity>
              </Link>
              <Link href="/bookings" asChild>
                <TouchableOpacity style={styles.actionButton}>
                  <ThemedText style={styles.actionButtonText}>My Bookings</ThemedText>
                </TouchableOpacity>
              </Link>
            </>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 16,
  },
  heroTitle: {
    textAlign: 'center',
    marginBottom: 8,
  },
  heroSubtitle: {
    textAlign: 'center',
    opacity: 0.7,
    marginBottom: 24,
  },
  formContainer: {
    marginBottom: 24,
  },
  ctaContainer: {
    marginBottom: 32,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  secondaryButton: {
    borderColor: '#007AFF',
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  linkButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  linkText: {
    color: '#007AFF',
    fontSize: 14,
  },
  featuresSection: {
    marginTop: 32,
  },
  sectionTitle: {
    marginBottom: 16,
  },
  featureItem: {
    marginBottom: 16,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  featureDesc: {
    opacity: 0.7,
  },
  welcomeSection: {
    marginBottom: 24,
  },
  welcomeSubtitle: {
    opacity: 0.7,
    marginTop: 4,
  },
  propertiesSection: {
    marginBottom: 24,
  },
  emptyState: {
    alignItems: 'center',
    padding: 20,
  },
  propertiesList: {
    marginTop: 12,
  },
  propertyCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  propertyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  propertyTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  propertyType: {
    fontSize: 12,
    color: '#666',
    textTransform: 'capitalize',
  },
  propertyLocation: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 4,
  },
  propertyPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 4,
  },
  propertyCapacity: {
    fontSize: 12,
    opacity: 0.6,
  },
  quickActions: {
    marginTop: 24,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
