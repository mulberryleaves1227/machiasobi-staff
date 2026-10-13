// 地図の上にお知らせを出すコンポーネント
export default {
  props: {
    message: { type: String, default: '' },
  },

  emits: ['close'],

  template: `
    <div v-if="message" class="toast" @click="$emit('close')">{{ message }}</div>
  `,
};
