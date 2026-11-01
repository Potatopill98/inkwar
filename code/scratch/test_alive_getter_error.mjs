// 验证主将死亡是否会抛出 TypeError
const obj = {};
Object.defineProperty(obj, 'alive', {
  get: () => false,
  configurable: true,
  enumerable: true
});

try {
  'use strict';
  obj.alive = false;
  console.log('No error without strict mode check');
} catch (e) {
  console.log('Caught expected error in strict mode:', e.message);
}
