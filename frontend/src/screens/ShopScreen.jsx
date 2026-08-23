import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from '../rnw';
import useGameStore from '../store/gameStore';

const ITEMS = [
  { id: 'hint', name: '提示卡', icon: '💡', price: 100, desc: '显示最佳操作建议' },
  { id: 'double', name: '双倍卡', icon: '💰', price: 200, desc: '下局赢得双倍筹码' },
  { id: 'revive', name: '复活卡', icon: '❤️', price: 500, desc: '筹码归零时自动使用' },
  { id: 'chips_500', name: '500筹码', icon: '💎', price: 500, desc: '购买500筹码' },
  { id: 'chips_2000', name: '2000筹码', icon: '💎', price: 1800, desc: '购买2000筹码' },
  { id: 'chips_10000', name: '10000筹码', icon: '💎', price: 8000, desc: '购买10000筹码' },
];

const ShopScreen = ({ onBack }) => {
  const { token, user } = useGameStore();
  const [items, setItems] = useState(ITEMS);
  const [inventory, setInventory] = useState({});

  useEffect(() => { fetchInventory(); }, []);

  const fetchInventory = async () => {
    try {
      const res = await fetch('/api/shop/items', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setInventory(data.inventory || {});
    } catch (e) { console.error(e); }
  };

  const buyItem = async (item) => {
    if ((user?.chips || 0) < item.price) { window.alert('筹码不足！'); return; }
    try {
      const res = await fetch('/api/shop/buy', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ itemId: item.id }) });
      const data = await res.json();
      if (res.ok) { window.alert(`购买成功：${item.name}`); fetchInventory(); }
      else window.alert(data.error || '购买失败');
    } catch (e) { window.alert('购买失败'); }
  };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={onBack}><Text style={s.backText}>←</Text></TouchableOpacity>
        <Text style={s.title}>商店</Text>
        <Text style={s.chips}>💰 {user?.chips || 0}</Text>
      </View>
      <ScrollView style={s.content} contentContainerStyle={s.contentInner}>
        <Text style={s.sectionTitle}>道具</Text>
        {items.filter(i => i.id.startsWith('hint') || i.id.startsWith('double') || i.id.startsWith('revive')).map(item => (
          <View key={item.id} style={s.shopItem}>
            <Text style={s.itemIcon}>{item.icon}</Text>
            <View style={s.itemInfo}><Text style={s.itemName}>{item.name}{inventory[item.id] ? ` (${inventory[item.id]})` : ''}</Text><Text style={s.itemDesc}>{item.desc}</Text></View>
            <TouchableOpacity style={s.buyBtn} onPress={() => buyItem(item)}><Text style={s.buyText}>💰{item.price}</Text></TouchableOpacity>
          </View>
        ))}
        <Text style={s.sectionTitle}>筹码包</Text>
        {items.filter(i => i.id.startsWith('chips')).map(item => (
          <View key={item.id} style={s.shopItem}>
            <Text style={s.itemIcon}>{item.icon}</Text>
            <View style={s.itemInfo}><Text style={s.itemName}>{item.name}</Text><Text style={s.itemDesc}>{item.desc}</Text></View>
            <TouchableOpacity style={s.buyBtn} onPress={() => buyItem(item)}><Text style={s.buyText}>💰{item.price}</Text></TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const s = StyleSheet.create({
  container:{flex:1,backgroundColor:'#faf9f7'},
  header:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingHorizontal:16,paddingVertical:12,backgroundColor:'white',borderBottomWidth:1,borderBottomColor:'#ebe7e2'},
  backBtn:{padding:6},backText:{fontSize:20,color:'#7a7068'},title:{fontSize:16,fontWeight:'600',color:'#4a4540'},chips:{fontSize:13,color:'#c4945c',fontWeight:'600'},
  content:{flex:1},contentInner:{padding:16,gap:8},
  sectionTitle:{fontSize:14,fontWeight:'600',color:'#4a4540',marginTop:8},
  shopItem:{flexDirection:'row',alignItems:'center',gap:12,padding:12,backgroundColor:'white',borderRadius:8,borderWidth:1,borderColor:'#ebe7e2'},
  itemIcon:{fontSize:24},itemInfo:{flex:1,gap:2},itemName:{fontSize:14,fontWeight:'600',color:'#4a4540'},itemDesc:{fontSize:11,color:'#b8b3ad'},
  buyBtn:{paddingVertical:8,paddingHorizontal:12,backgroundColor:'#c4945c',borderRadius:6},buyText:{color:'white',fontSize:12,fontWeight:'600'},
});
export default ShopScreen;
