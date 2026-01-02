/**
 * RestorePurchasesButton - Button to restore previous purchases
 *
 * Required by App Store guidelines. Users must be able to restore
 * their purchases on a new device or after reinstalling.
 */

import React, { useState } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { usePurchases } from '../../contexts/PurchaseContext';

interface RestorePurchasesButtonProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
  style?: ViewStyle;
  textStyle?: TextStyle;
  label?: string;
}

export function RestorePurchasesButton({
  onSuccess,
  onError,
  style,
  textStyle,
  label = 'Restore Purchases',
}: RestorePurchasesButtonProps) {
  const { restorePurchases, isPremium } = usePurchases();
  const [isRestoring, setIsRestoring] = useState(false);

  const handleRestore = async () => {
    setIsRestoring(true);

    try {
      const success = await restorePurchases();

      if (success && isPremium) {
        Alert.alert(
          'Purchases Restored',
          'Your purchases have been successfully restored.',
          [{ text: 'OK', onPress: onSuccess }]
        );
      } else {
        Alert.alert(
          'No Purchases Found',
          'We could not find any previous purchases to restore.',
          [{ text: 'OK' }]
        );
      }
    } catch (error: any) {
      const message = error.message || 'Failed to restore purchases';
      Alert.alert('Error', message, [{ text: 'OK' }]);
      onError?.(message);
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.button, style]}
      onPress={handleRestore}
      disabled={isRestoring}
    >
      {isRestoring ? (
        <ActivityIndicator size="small" color="#635BFF" />
      ) : (
        <Text style={[styles.text, textStyle]}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#635BFF',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default RestorePurchasesButton;
