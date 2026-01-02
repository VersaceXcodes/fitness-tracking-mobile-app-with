import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiService } from '@/services/api';

interface Property {
  property_id: string;
  host_id: string;
  title: string;
  description: string;
  city: string;
  neighborhood: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  property_type: string;
  guest_capacity: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  amenities: string | null;
  base_price_per_night: string;
  currency: string;
  has_power_backup: boolean;
  has_water_tank: boolean;
  house_rules: string | null;
  cancellation_policy: string;
  instant_book: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface PropertiesContextType {
  properties: Property[];
  loading: boolean;
  error: string | null;
  searchProperties: (filters?: {
    location?: string;
    check_in?: string;
    check_out?: string;
    guests?: number;
    price_min?: number;
    price_max?: number;
  }) => Promise<void>;
  getPropertyDetails: (propertyId: string) => Promise<Property | null>;
  clearError: () => void;
}

const PropertiesContext = createContext<PropertiesContextType | undefined>(undefined);

export const useProperties = () => {
  const context = useContext(PropertiesContext);
  if (context === undefined) {
    throw new Error('useProperties must be used within a PropertiesProvider');
  }
  return context;
};

export const PropertiesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchProperties = async (filters?: {
    location?: string;
    check_in?: string;
    check_out?: string;
    guests?: number;
    price_min?: number;
    price_max?: number;
  }) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await apiService.getProperties(filters);
      if (result.properties) {
        setProperties(result.properties);
      } else {
        setProperties([]);
      }
    } catch (err) {
      console.error('Failed to fetch properties:', err);
      setError('Failed to load properties. Please try again.');
      setProperties([]);
    } finally {
      setLoading(false);
    }
  };

  const getPropertyDetails = async (propertyId: string): Promise<Property | null> => {
    try {
      const result = await apiService.getProperty(propertyId);
      return result as Property;
    } catch (err) {
      console.error('Failed to fetch property details:', err);
      return null;
    }
  };

  const clearError = () => {
    setError(null);
  };

  // Load initial properties on mount
  useEffect(() => {
    searchProperties();
  }, []);

  const value: PropertiesContextType = {
    properties,
    loading,
    error,
    searchProperties,
    getPropertyDetails,
    clearError,
  };

  return <PropertiesContext.Provider value={value}>{children}</PropertiesContext.Provider>;
};