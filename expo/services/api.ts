import Constants from 'expo-constants';

const API_BASE_URL = Constants.expoConfig?.extra?.apiUrl || 
  process.env.EXPO_PUBLIC_API_URL || 
  'https://123templatetest-api.launchpulse.ai';

interface ApiResponse<T> {
  success?: boolean;
  data?: T;
  message?: string;
  error_code?: string;
  [key: string]: any;
}

class ApiService {
  private baseURL: string;
  private token: string | null = null;

  constructor() {
    this.baseURL = API_BASE_URL;
  }

  setToken(token: string | null) {
    this.token = token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers as Record<string, string>,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  // Authentication
  async login(email: string, password: string) {
    return this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async register(userData: {
    email: string;
    password_hash: string;
    name: string;
    phone_number: string;
    role: string;
  }) {
    return this.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async verifyToken() {
    return this.request('/api/auth/verify');
  }

  // Properties
  async getProperties(params?: {
    location?: string;
    check_in?: string;
    check_out?: string;
    guests?: number;
    price_min?: number;
    price_max?: number;
    limit?: number;
    offset?: number;
  }) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }
    
    return this.request(`/api/properties?${queryParams.toString()}`);
  }

  async getProperty(propertyId: string) {
    return this.request(`/api/properties/${propertyId}`);
  }

  async getPropertyPhotos(propertyId: string) {
    return this.request(`/api/properties/${propertyId}/photos`);
  }

  async getPropertyAvailability(propertyId: string, startDate?: string, endDate?: string) {
    const queryParams = new URLSearchParams();
    if (startDate) queryParams.append('start_date', startDate);
    if (endDate) queryParams.append('end_date', endDate);
    
    return this.request(`/api/properties/${propertyId}/availability?${queryParams.toString()}`);
  }

  // Users
  async getUser(userId: string) {
    return this.request(`/api/users/${userId}`);
  }

  async getUserListings(userId: string) {
    return this.request(`/api/users/${userId}/listings`);
  }

  async getUserBookings(userId: string, status?: string) {
    const queryParams = new URLSearchParams();
    if (status) queryParams.append('status', status);
    
    return this.request(`/api/users/${userId}/bookings?${queryParams.toString()}`);
  }

  // Bookings
  async createBooking(bookingData: {
    property_id: string;
    check_in: string;
    check_out: string;
    guest_count: number;
    total_price: number;
    service_fee: number;
    special_requests?: string;
  }) {
    return this.request('/api/bookings', {
      method: 'POST',
      body: JSON.stringify(bookingData),
    });
  }

  async getBooking(bookingId: string) {
    return this.request(`/api/bookings/${bookingId}`);
  }

  async updateBooking(bookingId: string, updates: any) {
    return this.request(`/api/bookings/${bookingId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  // Reviews
  async getPropertyReviews(propertyId: string) {
    return this.request(`/api/properties/${propertyId}/reviews`);
  }

  async createReview(bookingId: string, reviewData: {
    cleanliness_rating: number;
    accuracy_rating: number;
    communication_rating: number;
    location_rating: number;
    check_in_rating: number;
    value_rating: number;
    overall_rating: number;
    comment: string;
  }) {
    return this.request(`/api/bookings/${bookingId}/reviews`, {
      method: 'POST',
      body: JSON.stringify(reviewData),
    });
  }

  // Conversations
  async getConversations() {
    return this.request('/api/conversations');
  }

  async getConversation(conversationId: string) {
    return this.request(`/api/conversations/${conversationId}`);
  }

  async getMessages(conversationId: string, limit = 20, offset = 0) {
    return this.request(`/api/conversations/${conversationId}/messages?limit=${limit}&offset=${offset}`);
  }

  async sendMessage(conversationId: string, content: string) {
    return this.request(`/api/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  }

  // Notifications
  async getNotifications(limit = 10, offset = 0, isRead?: boolean) {
    const queryParams = new URLSearchParams();
    queryParams.append('limit', limit.toString());
    queryParams.append('offset', offset.toString());
    if (isRead !== undefined) {
      queryParams.append('is_read', isRead.toString());
    }
    
    return this.request(`/api/notifications?${queryParams.toString()}`);
  }

  async updateNotification(notificationId: string, updates: any) {
    return this.request(`/api/notifications/${notificationId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }
}

export const apiService = new ApiService();