/**
 * 帽子21点 - 商店系统路由
 * 提供道具购买、商品列表等功能
 * 
 * POST /api/shop/buy - 购买道具
 * GET /api/shop/items - 商品列表
 * GET /api/shop/inventory - 用户道具库存
 */

const express = require('express');
const router = express.Router();
const { User, ITEM_TYPES } = require('../models/User');
const { authMiddleware } = require('../middleware/auth');

/**
 * GET /api/shop/items
 * 获取商店商品列表
 */
router.get('/items', async (req, res) => {
  try {
    const items = await User.getShopItems();
    res.json({
      success: true,
      items: items.map(item => ({
        type: item.type,
        name: item.name,
        icon: item.icon,
        price: item.price,
        description: item.description
      }))
    });
  } catch (error) {
    console.error('❌ 获取商品列表失败:', error);
    res.status(500).json({ success: false, message: '获取商品列表失败' });
  }
});

/**
 * POST /api/shop/buy
 * 购买道具
 * 
 * Request Body:
 * {
 *   "itemType": "hint",  // 道具类型
 *   "quantity": 1        // 购买数量（默认1）
 * }
 */
router.post('/buy', authMiddleware, async (req, res) => {
  try {
    const { itemType, quantity = 1 } = req.body;

    // 验证道具类型
    if (!itemType || !ITEM_TYPES[itemType]) {
      return res.status(400).json({
        success: false,
        message: '未知道具类型',
        validTypes: Object.keys(ITEM_TYPES)
      });
    }

    // 验证数量
    const qty = parseInt(quantity);
    if (isNaN(qty) || qty < 1 || qty > 99) {
      return res.status(400).json({
        success: false,
        message: '购买数量必须在1-99之间'
      });
    }

    // 执行购买
    const result = await User.buyItem(req.userId, itemType, qty);

    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        data: {
          itemType,
          quantity: qty,
          chips: result.chips,
          items: result.items
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message
      });
    }
  } catch (error) {
    console.error('❌ 购买道具失败:', error);
    res.status(500).json({ success: false, message: '购买道具失败' });
  }
});

/**
 * GET /api/shop/inventory
 * 获取用户道具库存
 */
router.get('/inventory', authMiddleware, async (req, res) => {
  try {
    const items = await User.getUserItems(req.userId);
    
    // 将道具信息补充完整
    const inventory = Object.entries(items).map(([type, count]) => ({
      type,
      name: ITEM_TYPES[type]?.name || type,
      icon: ITEM_TYPES[type]?.icon || '📦',
      count,
      description: getItemDescription(type)
    }));

    res.json({
      success: true,
      inventory
    });
  } catch (error) {
    console.error('❌ 获取道具库存失败:', error);
    res.status(500).json({ success: false, message: '获取道具库存失败' });
  }
});

/**
 * POST /api/shop/gift
 * 赠送道具给好友
 * 
 * Request Body:
 * {
 *   "friendId": "xxx",  // 好友ID
 *   "itemType": "hint", // 道具类型
 *   "quantity": 1       // 赠送数量
 * }
 */
router.post('/gift', authMiddleware, async (req, res) => {
  try {
    const { friendId, itemType, quantity = 1 } = req.body;

    if (!friendId) {
      return res.status(400).json({ success: false, message: '请指定好友ID' });
    }

    if (!itemType || !ITEM_TYPES[itemType]) {
      return res.status(400).json({ success: false, message: '未知道具类型' });
    }

    // 检查是否是自己
    if (friendId === req.userId) {
      return res.status(400).json({ success: false, message: '不能赠送给自己' });
    }

    // 检查好友是否存在
    const friend = await User.findById(friendId);
    if (!friend) {
      return res.status(404).json({ success: false, message: '好友不存在' });
    }

    // 检查是否拥有足够道具
    const items = await User.getUserItems(req.userId);
    if (!items[itemType] || items[itemType] < quantity) {
      return res.status(400).json({ success: false, message: '道具数量不足' });
    }

    // 扣除自己的道具
    await User.updateUserItem(req.userId, itemType, -quantity);

    // 给好友添加道具
    await User.addItem(friendId, itemType, quantity);

    const updatedItems = await User.getUserItems(req.userId);

    res.json({
      success: true,
      message: `成功赠送 ${ITEM_TYPES[itemType].name} x${quantity} 给 ${friend.username}`,
      items: updatedItems
    });
  } catch (error) {
    console.error('❌ 赠送道具失败:', error);
    res.status(500).json({ success: false, message: '赠送道具失败' });
  }
});

/**
 * GET /api/shop/daily-free
 * 领取每日免费道具
 */
router.post('/daily-free', authMiddleware, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // 检查今日是否已领取
    const claimed = await User.checkDailyFreeClaim(req.userId, today);
    if (claimed) {
      return res.status(400).json({ success: false, message: '今日已领取免费道具' });
    }

    // 赠送免费道具
    const freeItems = { hint: 1, insurance: 1 };
    for (const [itemType, count] of Object.entries(freeItems)) {
      await User.addItem(req.userId, itemType, count);
    }

    // 记录已领取
    await User.recordDailyFreeClaim(req.userId, today);

    const items = await User.getUserItems(req.userId);

    res.json({
      success: true,
      message: '每日免费道具已领取',
      items,
      freeItems
    });
  } catch (error) {
    console.error('❌ 领取每日免费道具失败:', error);
    res.status(500).json({ success: false, message: '领取失败' });
  }
});

// 辅助函数：获取道具描述
function getItemDescription(itemType) {
  const descriptions = {
    hint: '提示最佳操作，助你做出正确决策',
    double: '本局获胜时筹码翻倍',
    revive: '筹码归零时自动使用，恢复500筹码',
    insurance: '庄家Blackjack时返还50%下注',
    lucky: '本局Blackjack赔付提升至3:2'
  };
  return descriptions[itemType] || '';
}

module.exports = router;
