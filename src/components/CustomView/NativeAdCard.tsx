import React, { useEffect, useState } from 'react';

import { View, Text, Image, Platform, StyleSheet } from 'react-native';

import {
  NativeAd,
  NativeAdView,
  NativeAsset,
  NativeAssetType,
  NativeMediaView,
  TestIds,
} from 'react-native-google-mobile-ads';

const AD_CARD_HEIGHT = 360;
const ANDROID_NATIVE_AD_UNIT_ID = 'ca-app-pub-9540920888011810/4647633114';
const IOS_NATIVE_AD_UNIT_ID = 'ca-app-pub-9540920888011810/6633529988';
const PRODUCTION_NATIVE_AD_UNIT_ID =
  Platform.OS === 'ios' ? IOS_NATIVE_AD_UNIT_ID : ANDROID_NATIVE_AD_UNIT_ID;
const NATIVE_AD_UNIT_ID = __DEV__
  ? TestIds.NATIVE
  : PRODUCTION_NATIVE_AD_UNIT_ID;

export default function NativeAdCard() {
  const [nativeAd, setNativeAd] = useState<NativeAd | null>(null);

  useEffect(() => {
    let ad: NativeAd;

    NativeAd.createForAdRequest(NATIVE_AD_UNIT_ID)

      .then(loadedNativeAd => {
        ad = loadedNativeAd;

        setNativeAd(loadedNativeAd);
      })

      .catch(console.error);

    return () => {
      ad?.destroy();
    };
  }, []);

  if (!nativeAd) {
    return (
      <View style={[styles.card, styles.placeholderCard]}>
        <View style={styles.badge} />
        <View style={styles.placeholderMedia} />
        <View style={styles.row}>
          <View style={styles.placeholderIcon} />
          <View style={styles.placeholderTextBlock}>
            <View style={styles.placeholderTitle} />
            <View style={styles.placeholderSubtitle} />
          </View>
        </View>
        <View style={styles.placeholderBody} />
        <View style={styles.placeholderCta} />
      </View>
    );
  }

  return (
    <NativeAdView nativeAd={nativeAd} style={styles.card}>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>廣告</Text>
      </View>

      <NativeMediaView style={styles.media} />

      <View style={styles.row}>
        {nativeAd.icon && (
          <NativeAsset assetType={NativeAssetType.ICON}>
            <Image source={{ uri: nativeAd.icon.url }} style={styles.icon} />
          </NativeAsset>
        )}

        <View style={styles.adTextBlock}>
          <NativeAsset assetType={NativeAssetType.HEADLINE}>
            <Text numberOfLines={1} style={styles.title}>
              {nativeAd.headline}
            </Text>
          </NativeAsset>

          {!!nativeAd.advertiser && (
            <NativeAsset assetType={NativeAssetType.ADVERTISER}>
              <Text numberOfLines={1} style={styles.subtitle}>
                {nativeAd.advertiser}
              </Text>
            </NativeAsset>
          )}
        </View>
      </View>

      {!!nativeAd.body && (
        <NativeAsset assetType={NativeAssetType.BODY}>
          <Text numberOfLines={2} style={styles.body}>
            {nativeAd.body}
          </Text>
        </NativeAsset>
      )}

      {!!nativeAd.callToAction && (
        <NativeAsset assetType={NativeAssetType.CALL_TO_ACTION}>
          <Text style={styles.cta}>{nativeAd.callToAction}</Text>
        </NativeAsset>
      )}
    </NativeAdView>
  );
}

const styles = StyleSheet.create({
  card: {
    height: AD_CARD_HEIGHT,

    margin: 16,

    padding: 12,

    borderRadius: 16,

    backgroundColor: '#fff',

    shadowColor: '#000',

    shadowOpacity: 0.12,

    shadowRadius: 10,

    elevation: 4,

    overflow: 'hidden',
  },

  placeholderCard: {
    backgroundColor: 'rgba(255,255,255,0.92)',
  },

  badge: {
    alignSelf: 'flex-start',

    paddingHorizontal: 8,

    paddingVertical: 3,

    borderRadius: 6,

    backgroundColor: '#eee',

    marginBottom: 8,
  },

  badgeText: {
    fontSize: 12,

    color: '#666',
  },

  media: {
    width: '100%',

    height: 180,

    borderRadius: 12,

    marginBottom: 12,
  },

  placeholderMedia: {
    width: '100%',

    height: 180,

    borderRadius: 12,

    marginBottom: 12,

    backgroundColor: '#E5E7EB',
  },

  row: {
    flexDirection: 'row',

    alignItems: 'center',

    gap: 10,
  },

  adTextBlock: {
    flex: 1,
  },

  icon: {
    width: 42,

    height: 42,

    borderRadius: 8,
  },

  placeholderIcon: {
    width: 42,

    height: 42,

    borderRadius: 8,

    backgroundColor: '#E5E7EB',
  },

  placeholderTextBlock: {
    flex: 1,
  },

  placeholderTitle: {
    width: '70%',

    height: 16,

    borderRadius: 4,

    backgroundColor: '#E5E7EB',
  },

  placeholderSubtitle: {
    width: '42%',

    height: 12,

    borderRadius: 4,

    marginTop: 8,

    backgroundColor: '#E5E7EB',
  },

  placeholderBody: {
    width: '86%',

    height: 34,

    borderRadius: 6,

    marginTop: 12,

    backgroundColor: '#E5E7EB',
  },

  placeholderCta: {
    height: 40,

    borderRadius: 10,

    marginTop: 12,

    backgroundColor: '#111',
  },

  title: {
    fontSize: 16,

    fontWeight: '700',
  },

  subtitle: {
    fontSize: 12,

    color: '#777',

    marginTop: 2,
  },

  body: {
    fontSize: 14,

    color: '#555',

    marginTop: 10,
  },

  cta: {
    marginTop: 12,

    paddingVertical: 10,

    borderRadius: 10,

    textAlign: 'center',

    fontWeight: '700',

    backgroundColor: '#111',

    color: '#fff',
  },
});
