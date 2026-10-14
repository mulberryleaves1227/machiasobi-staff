// ポップアップに場所の詳細を出すコンポーネント
export default {
  props: {
    place: { type: Object, required: true },
    timelineUrl: { type: String, default: '' },
    areaUrl: { type: String, default: '' },
    linkTarget: { type: String, default: '_self' },
  },

  computed: {
    // 説明文を文字とURLに分ける関数
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
    <div v-if="timelineUrl || areaUrl" class="pop-links">
      <a v-if="timelineUrl" :href="timelineUrl" :target="linkTarget">📅 タイムテーブル</a>
      <a v-if="areaUrl" :href="areaUrl" :target="linkTarget">📍 エリア詳細</a>
    </div>
  `,
};
