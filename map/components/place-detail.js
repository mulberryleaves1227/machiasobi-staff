// place-detail.js — ポップアップに出す、ピン・エリア1件の詳細
// props:
//   place  表示する場所 { name, description, folder, ... }（venue-map.js の place）

export default {
  props: {
    place: { type: Object, required: true },
  },

  computed: {
    // 説明文を「普通の文字」と「URL」の部品に分ける（URL は短いリンクで表示するため）
    // マイマップの説明に入っている <br> は改行に直す
    descriptionParts() {
      const text = (this.place.description || '').replace(/<br\s*\/?>/gi, '\n');
      return text.split(/(https?:\/\/[^\s<]+)/).filter(Boolean).map(s => ({
        text: s,
        isUrl: /^https?:\/\//.test(s),
      }));
    },
  },

  template: `
    <div class="pop-folder">{{ place.folder }}</div>
    <h3>{{ place.name }}</h3>
    <p v-if="descriptionParts.length">
      <template v-for="(part, i) in descriptionParts" :key="i">
        <a v-if="part.isUrl" :href="part.text" target="_blank" rel="noopener">公式ページ ↗</a>
        <template v-else>{{ part.text }}</template>
      </template>
    </p>
  `,
};
