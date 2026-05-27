import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { HomeHeader } from '@/components/CustomHeader';

type Props = {
  children: React.ReactNode;
  fadeHeight?: number;
  roundedTopRight?: boolean;
  style?: StyleProp<ViewStyle>;
};

const DEFAULT_FADE_HEIGHT = 12;

const GradientView = ({
  children,
  fadeHeight = DEFAULT_FADE_HEIGHT,
  roundedTopRight = false,
  style,
}: Props) => {
  return (
    <>
      <View
        style={[
          {
            flex: 1,
            backgroundColor: '#FFF',
            overflow: 'hidden',
            position: 'relative',
            borderTopRightRadius: roundedTopRight ? 44 : undefined,
          },
          style,
        ]}
      >
        {children}
        <LinearGradient
          pointerEvents="none"
          start={{ x: 0, y: 0.1 }}
          end={{ x: 0, y: 1 }}
          colors={['rgba(0,0,0,0.45)', 'rgba(0,0,0,0)']}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            height: 12,
            zIndex: 10,
            elevation: 10,
          }}
        />
        <LinearGradient
          pointerEvents="none"
          start={{ x: 0, y: 1 }}
          end={{ x: 0, y: 0 }}
          colors={['rgba(0,0,0,0.75)', 'rgba(0,0,0,0)']}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: fadeHeight,
            zIndex: 10,
            elevation: 10,
          }}
        />
      </View>
    </>
  );
};

export default GradientView;
