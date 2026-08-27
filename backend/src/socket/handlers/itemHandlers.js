/**
 * 帽子21点 - 道具处理器
 * 游戏中使用道具
 */

const { User } = require('../../models/User');
const logger = require('../../utils/logger');

// 道具效果定义
const ITEM_EFFECTS = {
  hint: { name: '提示卡', desc: '显示最佳操作建议', instant: true },
  double: { name: '双倍卡', desc: '本局赢得双倍筹码', instant: false },
  revive: { name: '复活卡', desc: '筹码归零自动恢复500', instant: false, auto: true },
  insurance: { name: '保险卡', desc: '庄家BJ返还50%下注', instant: false },
  lucky: { name: '幸运卡', desc: 'BJ赔付提升至3:2', instant: false },
};

// 玩家激活的道具效果: socketId -> Set<itemType>
const activeEffects = new Map();

function initItemHandlers(io, sharedState) {
  const { games, playerGameMap, playerChipsMap } = sharedState;

  return (socket) => {
    // 使用道具
    socket.on('useItem', async (data) => {
      const { itemType } = data;
      const effect = ITEM_EFFECTS[itemType];
      if (!effect) return socket.emit('itemResult', { success: false, message: '道具不存在' });

      try {
        // 扣除道具
        const result = await User.useItem(socket.userId, itemType);
        if (!result.success) {
          return socket.emit('itemResult', { success: false, message: result.message });
        }

        // 激活效果
        if (!activeEffects.has(socket.id)) activeEffects.set(socket.id, new Set());
        activeEffects.get(socket.id).add(itemType);

        // 提示卡：立即返回建议
        if (itemType === 'hint') {
          const gameId = playerGameMap.get(socket.id);
          const game = games.get(gameId);
          if (game) {
            const suggestion = game.getHint(socket.id);
            socket.emit('itemResult', {
              success: true,
              itemType: 'hint',
              message: `建议: ${suggestion}`,
              suggestion
            });
          }
        } else {
          socket.emit('itemResult', {
            success: true,
            itemType,
            message: `${effect.name}已激活！${effect.desc}`
          });
        }

        // 广播道具使用
        const gameId = playerGameMap.get(socket.id);
        if (gameId) {
          io.to(gameId).emit('itemUsed', {
            username: socket.playerName,
            itemType,
            itemName: effect.name
          });
        }

        logger.info(`玩家 ${socket.playerName} 使用道具: ${itemType}`);
      } catch (error) {
        logger.error('使用道具失败:', error);
        socket.emit('itemResult', { success: false, message: '使用失败' });
      }
    });

    // 获取道具库存
    socket.on('getItems', async () => {
      try {
        const items = await User.getUserInventory(socket.userId);
        socket.emit('playerItems', { items });
      } catch (error) {
        logger.error('获取道具失败:', error);
      }
    });
  };
}

// 检查玩家是否有激活的道具效果
function hasEffect(socketId, itemType) {
  return activeEffects.get(socketId)?.has(itemType) || false;
}

// 消耗道具效果（游戏结束后调用）
function consumeEffects(socketId) {
  const effects = activeEffects.get(socketId);
  if (effects) {
    effects.delete('double');
    effects.delete('insurance');
    effects.delete('lucky');
    effects.delete('hint');
  }
}

// 破产时自动使用复活卡
async function tryRevive(userId, socketId) {
  if (!hasEffect(socketId, 'revive')) return false;
  try {
    await User.setChips(userId, 500);
    activeEffects.get(socketId)?.delete('revive');
    return true;
  } catch (error) {
    logger.error('复活失败:', error);
    return false;
  }
}

module.exports = { initItemHandlers, hasEffect, consumeEffects, tryRevive, ITEM_EFFECTS };
