/**
 * 帽子21点 - 商店页面
 */

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from '../rnw';
import useGameStore from '../store/gameStore';

const ShopScreen = ({ onBack }) => {
  const { token, user } = useGameStore();
  const [activeTab, setActiveTab] = useState('items');
  const [shopItems, setShopItems] = useState([]);
  const [userItems, setUserItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [purchasing, setPurchasing] = useState(false);

  const tabs = [
    { key: 'items', label: '道具', icon: '🎒' },
    { key: 'chips', label: '筹码包', icon: '💰' },
  ];

  useEffect(() => {
    fetchShopItems();
    fetchUserItems();
  }, [activeTab]);

  const fetchShopItems = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/shop/items', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setShopItems(data.items || []);
      } else {
        setError(data.error || data.message || '获取商品列表失败');
      }
    } catch (err) {
      console.error('获取商品列表失败:', err);
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserItems = async () => {
    try {
      const response = await fetch('/api/shop/inventory', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setUserItems(data.items || data.inventory || []);
      }
    } catch (err) {
      console.error('获取用户道具失败:', err);
    }
  };

  const handlePurchase = async (itemType) => {
    setPurchasing(true);
    setError('');
    try {
      const response = await fetch('/api/shop/buy', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ itemType })
      });
      const data = await response.json();
      if (response.ok) {
        await fetchUserItems();
        await fetchShopItems();
      } else {
        setError(data.error || data.message || '购买失败');
      }
    } catch (err) {
      console.error('购买失败:', err);
      setError('网络错误，请稍后重试');
    } finally {
      setPurchasing(false);
    }
  };

  const getItemIcon = (item) => {
    if (item.icon) return item.icon;
    if (activeTab === 'chips') return '💰';
    return '🎁';
  };

  const getUserItemCount = (itemId) => {
    const owned = userItems.find((i) => i.itemId === itemId || i.id === itemId);
    return owned ? owned.quantity : 0;
  };

  return (
    <View style={styles.container}>
      {/* 顶部导航 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>商店</Text>
        <View style={styles.chipsDisplay}>
          <Text style={styles.chipsText}>💰 {user?.chips || 0}</Text>
        </View>
      </View>

      {/* 标签切换 */}
      <View style={styles.tabBar}>
        {tabs.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={styles.tabIcon}>{tab.icon}</Text>
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 错误提示 */}
      {error ? (
        <View style={styles.errorBar}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        {/* 我的道具 */}
        {activeTab === 'items' && userItems.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>我的道具</Text>
            <View style={styles.ownedList}>
              {userItems.map((item, index) => (
                <View key={item.id || index} style={styles.ownedItem}>
                  <Text style={styles.ownedIcon}>{item.icon || '🎒'}</Text>
                  <View style={styles.ownedInfo}>
                    <Text style={styles.ownedName}>{item.name}</Text>
                    <Text style={styles.ownedDesc}>{item.description}</Text>
                  </View>
                  <View style={styles.ownedCount}>
                    <Text style={styles.ownedCountText}>x{item.quantity}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* 商品列表 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {activeTab === 'items' ? '道具商店' : '筹码包'}
          </Text>
          {loading ? (
            <View style={styles.loading}>
              <Text style={styles.loadingText}>加载商品中...</Text>
            </View>
          ) : shopItems.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>暂无商品</Text>
            </View>
          ) : (
            <View style={styles.shopList}>
              {shopItems.map((item) => {
                const ownedCount = getUserItemCount(item.id);
                const canAfford = (user?.chips || 0) >= item.price;

                return (
                  <View key={item.id} style={styles.shopItem}>
                    <View style={styles.itemIcon}>
                      <Text style={styles.itemIconText}>{getItemIcon(item)}</Text>
                    </View>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName}>{item.name}</Text>
                      <Text style={styles.itemDesc}>{item.description}</Text>
                      {ownedCount > 0 && (
                        <Text style={styles.itemOwned}>已拥有 x{ownedCount}</Text>
                      )}
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.buyBtn,
                        (!canAfford || purchasing) && styles.buyBtnDisabled
                      ]}
                      onPress={() => handlePurchase(item.id)}
                      disabled={!canAfford || purchasing}
                    >
                      <Text style={[
                        styles.buyBtnText,
                        (!canAfford || purchasing) && styles.buyBtnTextDisabled
                      ]}>
                        💰 {item.price}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* 提示信息 */}
        <View style={styles.tips}>
          <Text style={styles.tipsTitle}>温馨提示</Text>
          <Text style={styles.tipsText}>• 道具在对局中可使用，帮助获得优势</Text>
          <Text style={styles.tipsText}>• 筹码包购买后可立即到账</Text>
          <Text style={styles.tipsText}>• 道具数量无上限，可重复购买</Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#faf9f7',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#ebe7e2',
  },
  backBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  backBtnText: {
    fontSize: 20,
    color: '#7a7068',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4a4540',
  },
  chipsDisplay: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    backgroundColor: '#f0ece6',
    borderRadius: 12,
  },
  chipsText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#c4945c',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#ebe7e2',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 4,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#6b9b6a',
  },
  tabIcon: {
    fontSize: 16,
  },
  tabText: {
    fontSize: 12,
    color: '#b8b3ad',
  },
  tabTextActive: {
    color: '#6b9b6a',
    fontWeight: '600',
  },
  errorBar: {
    backgroundColor: '#fee',
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#fcc',
  },
  errorText: {
    color: '#c33',
    fontSize: 12,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  contentInner: {
    padding: 16,
    gap: 16,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8a8580',
  },
  ownedList: {
    gap: 6,
  },
  ownedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ebe7e2',
  },
  ownedIcon: {
    fontSize: 20,
  },
  ownedInfo: {
    flex: 1,
    gap: 2,
  },
  ownedName: {
    fontSize: 13,
    fontWeight: '500',
    color: '#4a4540',
  },
  ownedDesc: {
    fontSize: 11,
    color: '#b8b3ad',
  },
  ownedCount: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    backgroundColor: '#f0ece6',
    borderRadius: 10,
  },
  ownedCountText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8a8580',
  },
  loading: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    color: '#b8b3ad',
    fontSize: 14,
  },
  emptyCard: {
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ebe7e2',
    alignItems: 'center',
  },
  emptyText: {
    color: '#b8b3ad',
    fontSize: 13,
  },
  shopList: {
    gap: 8,
  },
  shopItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ebe7e2',
  },
  itemIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#f5f3f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemIconText: {
    fontSize: 18,
  },
  itemInfo: {
    flex: 1,
    gap: 2,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4a4540',
  },
  itemDesc: {
    fontSize: 11,
    color: '#b8b3ad',
  },
  itemOwned: {
    fontSize: 10,
    color: '#6b9b6a',
    fontWeight: '500',
  },
  buyBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: '#6b9b6a',
    borderRadius: 8,
  },
  buyBtnDisabled: {
    backgroundColor: '#ebe7e2',
  },
  buyBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  buyBtnTextDisabled: {
    color: '#b8b3ad',
  },
  tips: {
    padding: 14,
    backgroundColor: 'white',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#f3f0eb',
    gap: 6,
  },
  tipsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8a8580',
  },
  tipsText: {
    fontSize: 11,
    color: '#b8b3ad',
    lineHeight: 1.6,
  },
});

export default ShopScreen;
