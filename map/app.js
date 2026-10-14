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
// ?embed=1 のときは他のページに埋め込まれている
const EMBED = queryParam('embed') === '1';
if (EMBED) document.body.classList.add('embed');

// 地図は Vue の data に入れると壊れるのでここで持つ
let venueMap = null;

createApp({
  components: { PlaceDetail, PlaceChoices, LocateButton, MapToast },

  data() {
    return {
      eventLabel: '',  // 見出しの「Vol.31」
      mymapUrl: '#',   // Googleマップのリンク
      toast: '',       // 地図上のお知らせ
      locating: false, // 現在地を表示中か
      selected: null,  // 詳細を出している場所
      choices: [],     // 候補として並べている場所
      timelineVenues: {}, // ピン名 → タイムテーブルのタブ名
      areaSections: {},   // ピン名 → エリア詳細の見出し
      linkTarget: EMBED ? '_top' : '_self', // 埋め込み時はページごと移動する
    };
  },

  // 画面ができたら地図を作る関数
  async mounted() {
    // 画面が表示されるのを待つ（待たないと地図が小さく固まる）
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

  computed: {
    // 選んだ場所のタイムテーブルのリンクを返す関数
    timelineUrl() {
      const venue = this.selected && this.timelineVenues[this.selected.name];
      return venue ? `../timeline/index.html?venue=${encodeURIComponent(venue)}` : '';
    },

    // 選んだ場所のエリア詳細のリンクを返す関数
    areaUrl() {
      const section = this.selected && this.areaSections[this.selected.name];
      return section ? `../area/index.html?acc=${encodeURIComponent(section)}` : '';
    },
  },

  methods: {
    // 開催回を読み込んでピンを表示する関数
    async loadEvent() {
      try {
        const ev = await loadCurrentEvent(queryParam('event'));
        if (!ev) return;
        this.eventLabel = ev.label;
        this.mymapUrl = MYMAP_VIEWER + encodeURIComponent(ev.mymap_id);
        this.timelineVenues = ev.timeline_venues || {};
        this.areaSections = ev.area_sections || {};
        document.title = `マチ★アソビ ${ev.label} 会場マップ`;
        await venueMap.showFeatures(await fetchMyMap(ev.mymap_id));
      } catch (err) {
        console.error('会場マップの読み込みに失敗', err);
      }
    },

    // 地図をタップしたときの関数
    onTap({ pins, area }) {
      if (pins.length > 1) this.showChoices(pins);
      else if (pins.length === 1) this.select(pins[0]);
      else if (area) this.select(area);
      else this.closePopup();
    },

    // 場所の詳細を出す関数
    async select(place) {
      this.choices = [];
      this.selected = place;
      venueMap.highlight([place.fid]);
      await this.$nextTick();
      venueMap.openPopup(place.lngLat, this.$refs.popupBody);
    },

    // 重なったピンの候補を出す関数
    async showChoices(places) {
      this.selected = null;
      this.choices = places;
      venueMap.highlight(places.map(p => p.fid));
      await this.$nextTick();
      venueMap.openPopup(places[0].lngLat, this.$refs.popupBody);
    },

    // ポップアップを閉じる関数
    closePopup() {
      this.selected = null;
      this.choices = [];
      venueMap.closePopup();
    },

    // 現在地の表示を切り替える関数
    toggleLocate() {
      venueMap.toggleLocate();
    },
  },
}).mount('#app');
