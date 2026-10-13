// app.js — 会場マップ画面（Vue）
// 画面の状態（見出し・お知らせ・現在地・選んでいる場所）をここで持ち、表示は components/ に任せる。
//   地図の中身        lib/venue-map.js
//   ピンのデータ      lib/kml.js
//   開催回の選び方    lib/event-select.js
//   位置情報の案内文  lib/geo-message.js
// 開催回の登録は data/map_events.json に1件追加するだけ。

import { createApp } from 'https://unpkg.com/vue@3.5.43/dist/vue.esm-browser.prod.js';
import { loadCurrentEvent } from './lib/event-select.js';
import { fetchMyMap } from './lib/kml.js';
import { geoErrorMessage, geoUnavailableMessage } from './lib/geo-message.js';
import { createVenueMap } from './lib/venue-map.js';
import PlaceDetail from './components/place-detail.js';
import PlaceChoices from './components/place-choices.js';
import LocateButton from './components/locate-button.js';
import MapToast from './components/map-toast.js';

const MYMAP_VIEWER = 'https://www.google.com/maps/d/viewer?mid=';

// MapLibre の地図は Vue のリアクティブにすると壊れるので、data ではなくここで持つ
let venueMap = null;

createApp({
  components: { PlaceDetail, PlaceChoices, LocateButton, MapToast },

  data() {
    return {
      eventLabel: '',  // 見出しの「Vol.31」部分
      mymapUrl: '#',   // 「Googleマップで開く」のリンク先
      toast: '',       // 地図の上に出すお知らせ（空なら出さない）
      locating: false, // 現在地を表示中か
      selected: null,  // ポップアップで詳細を出している場所
      choices: [],     // ポップアップで候補として並べている場所（重なったピン）
    };
  },

  // 画面ができたら地図を作り、現在地が使えるか確認し、開催回のピンを読み込む
  async mounted() {
    // mounted の時点ではまだ v-cloak で画面が隠れていて地図の枠の大きさが 0 なので、
    // 表示されるのを待ってから地図を作る（先に作ると 400×300 の初期サイズで固まる）
    await this.$nextTick();
    venueMap = createVenueMap(this.$refs.map, {
      onTap: places => this.onTap(places),
      onPopupClose: () => { this.selected = null; this.choices = []; },
      onLocateStart: () => { this.locating = true; this.toast = '現在地を取得しています…'; },
      onLocateEnd: () => { this.locating = false; },
      onLocated: () => { this.toast = ''; },
      onLocateError: code => { this.locating = false; this.toast = geoErrorMessage(code); },
    });
    this.toast = (await geoUnavailableMessage()) || '';
    this.loadEvent();
  },

  methods: {
    // 表示する開催回を決め、見出し・リンクを更新して、マイマップのピンを地図に載せる
    async loadEvent() {
      try {
        const ev = await loadCurrentEvent(queryParam('event'));
        if (!ev) return;
        this.eventLabel = ev.label;
        this.mymapUrl = MYMAP_VIEWER + encodeURIComponent(ev.mymap_id);
        document.title = `マチ★アソビ ${ev.label} 会場マップ`;
        await venueMap.showFeatures(await fetchMyMap(ev.mymap_id));
      } catch (err) {
        console.error('会場マップの読み込みに失敗', err);
      }
    },

    // 地図をタップしたとき
    // ピンが複数 → 候補を表示 / ピンが1つ → 詳細を表示 / ピンがなくエリア → エリアの詳細 / 何もない → 閉じる
    onTap({ pins, area }) {
      if (pins.length > 1) this.showChoices(pins);
      else if (pins.length === 1) this.select(pins[0]);
      else if (area) this.select(area);
      else this.closePopup();
    },

    // 場所を1つ選び、強調してポップアップで詳細を出す
    async select(place) {
      this.choices = [];
      this.selected = place;
      venueMap.highlight([place.fid]);
      await this.$nextTick(); // ポップアップの中身（PlaceDetail）が描かれるのを待つ
      venueMap.openPopup(place.lngLat, this.$refs.popupBody);
    },

    // 重なったピンを候補としてポップアップに並べる（一番近いピンの位置に出す）
    async showChoices(places) {
      this.selected = null;
      this.choices = places;
      venueMap.highlight(places.map(p => p.fid));
      await this.$nextTick(); // ポップアップの中身（PlaceChoices）が描かれるのを待つ
      venueMap.openPopup(places[0].lngLat, this.$refs.popupBody);
    },

    // ポップアップを閉じて、選択を解除する
    closePopup() {
      this.selected = null;
      this.choices = [];
      venueMap.closePopup();
    },

    // 「📍 現在地を取得」ボタン：現在地の表示を開始する（表示中ならやめる）
    toggleLocate() {
      venueMap.toggleLocate();
    },
  },
}).mount('#app');
