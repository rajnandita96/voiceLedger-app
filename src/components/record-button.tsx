/**
 * Recording Button — animated mic button with recording state.
 * Shows pulsing animation when recording.
 */

import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { GlassColors } from '@/constants/glass-theme';

interface RecordButtonProps {
  isRecording: boolean;
  onPress: () => void;
}

export function RecordButton({ isRecording, onPress }: RecordButtonProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const ringAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isRecording) {
      // Pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ]),
      ).start();

      // Ring expansion
      ringAnim.setValue(0);
      Animated.loop(
        Animated.timing(ringAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ).start();
    } else {
      pulseAnim.setValue(1);
      ringAnim.setValue(0);
      ringAnim.stopAnimation();
    }
  }, [isRecording]);

  const ringScale = ringAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 2],
  });
  const ringOpacity = ringAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.6, 0.2, 0],
  });

  const iconName: SFSymbol = isRecording ? 'stop.fill' : 'mic.fill';
  const iconColor = isRecording ? GlassColors.red : GlassColors.primary;

  return (
    <View style={styles.container}>
      {/* Animated ring */}
      {isRecording && (
        <Animated.View
          style={[
            styles.ring,
            {
              transform: [{ scale: ringScale }],
              opacity: ringOpacity,
            },
          ]}
        />
      )}

      {/* Main button */}
      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onPress}
          style={[styles.button, isRecording && styles.buttonRecording]}
        >
          <View
            style={[
              styles.inner,
              isRecording && styles.innerRecording,
            ]}
          >
            <SymbolView
              name={iconName}
              size={40}
              weight="bold"
              tintColor={iconColor}
            />
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  ring: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: GlassColors.red,
  },
  button: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 215, 115, 0.08)',
    borderWidth: 2,
    borderColor: GlassColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonRecording: {
    borderColor: GlassColors.red,
    backgroundColor: 'rgba(196, 69, 54, 0.08)',
  },
  inner: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255, 215, 115, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerRecording: {
    backgroundColor: 'rgba(196, 69, 54, 0.15)',
  },
});
