<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import {
  KnowhowApiError,
  createKnowhow,
  createMajorCategory,
  createMiddleCategory,
  fetchKnowhowDetail,
  fetchKnowhows,
  fetchMajorCategories,
  fetchMiddleCategories,
} from './api/knowhow-api'
import type { KnowhowDetail, KnowhowListItem, MajorCategory, MiddleCategory } from './api/types'
/** public/images 配下。BASE_URL 対応 */
const headerImg = (file: string) => `${import.meta.env.BASE_URL}images/${file}`

const majors = ref<MajorCategory[]>([])
const middles = ref<MiddleCategory[]>([])
const knowhowList = ref<KnowhowListItem[]>([])

const selectedMajorId = ref<string>('')
const selectedMiddleId = ref<string>('')
const selectedKnowhowId = ref<string>('')

const detail = ref<KnowhowDetail | null>(null)
const busyMajors = ref(false)
const busyMiddles = ref(false)
const busyKnowhowList = ref(false)
const busyDetail = ref(false)
const errorMessage = ref<string | null>(null)

const modal = ref<'major' | 'middle' | 'knowhow' | null>(null)
const formMajorName = ref('')
const formMiddleName = ref('')
const formKnowhowTitle = ref('')
const formKnowhowKeywords = ref('')
const formKnowhowContent = ref('')
const formSubmitting = ref(false)

const majorDisabled = computed(() => busyMajors.value)
const middleDisabled = computed(() => !selectedMajorId.value || busyMiddles.value)
const knowhowSelectDisabled = computed(() => !selectedMiddleId.value || busyKnowhowList.value)

function setError(e: unknown) {
  if (e instanceof KnowhowApiError) {
    let msg = e.message
    if (e.status === 409) {
      msg = '同名が既に存在します（409 Conflict）'
    } else if (e.status === 404) {
      msg = '対象が見つかりません（404）'
    }
    if (e.bodyText && e.bodyText.length < 200) {
      try {
        const j = JSON.parse(e.bodyText) as { message?: string; error?: string }
        if (j.message) msg = j.message
        else if (j.error) msg = j.error
      } catch {
        /* keep msg */
      }
    }
    errorMessage.value = msg
  } else if (e instanceof Error) {
    errorMessage.value = e.message
  } else {
    errorMessage.value = '予期しないエラーが発生しました'
  }
}

async function loadMajors() {
  busyMajors.value = true
  errorMessage.value = null
  try {
    majors.value = await fetchMajorCategories()
  } catch (e) {
    setError(e)
  } finally {
    busyMajors.value = false
  }
}

async function loadMiddles(majorId: number) {
  busyMiddles.value = true
  errorMessage.value = null
  try {
    middles.value = await fetchMiddleCategories(majorId)
  } catch (e) {
    setError(e)
    middles.value = []
  } finally {
    busyMiddles.value = false
  }
}

async function loadKnowhowsList(middleId: number) {
  busyKnowhowList.value = true
  errorMessage.value = null
  try {
    knowhowList.value = await fetchKnowhows(middleId)
  } catch (e) {
    setError(e)
    knowhowList.value = []
  } finally {
    busyKnowhowList.value = false
  }
}

async function loadDetail(id: number) {
  busyDetail.value = true
  errorMessage.value = null
  try {
    detail.value = await fetchKnowhowDetail(id)
  } catch (e) {
    setError(e)
    detail.value = null
  } finally {
    busyDetail.value = false
  }
}

watch(selectedMajorId, async (v) => {
  selectedMiddleId.value = ''
  selectedKnowhowId.value = ''
  detail.value = null
  middles.value = []
  knowhowList.value = []
  if (!v) return
  const id = Number(v)
  if (Number.isNaN(id)) return
  await loadMiddles(id)
})

watch(selectedMiddleId, async (v) => {
  selectedKnowhowId.value = ''
  detail.value = null
  knowhowList.value = []
  if (!v) return
  const id = Number(v)
  if (Number.isNaN(id)) return
  await loadKnowhowsList(id)
})

watch(selectedKnowhowId, async (v) => {
  detail.value = null
  if (!v) return
  const id = Number(v)
  if (Number.isNaN(id)) return
  await loadDetail(id)
})

onMounted(() => {
  void loadMajors()
})

function openModal(which: 'major' | 'middle' | 'knowhow') {
  errorMessage.value = null
  modal.value = which
  formMajorName.value = ''
  formMiddleName.value = ''
  formKnowhowTitle.value = ''
  formKnowhowKeywords.value = ''
  formKnowhowContent.value = ''
}

function closeModal() {
  modal.value = null
}

async function submitMajor() {
  const name = formMajorName.value.trim()
  if (!name) return
  formSubmitting.value = true
  errorMessage.value = null
  try {
    await createMajorCategory(name)
    await loadMajors()
    closeModal()
  } catch (e) {
    setError(e)
  } finally {
    formSubmitting.value = false
  }
}

async function submitMiddle() {
  const majorId = Number(selectedMajorId.value)
  const name = formMiddleName.value.trim()
  if (!name || Number.isNaN(majorId)) return
  formSubmitting.value = true
  errorMessage.value = null
  try {
    const created = await createMiddleCategory(majorId, name)
    await loadMiddles(majorId)
    selectedMiddleId.value = String(created.id)
    closeModal()
  } catch (e) {
    setError(e)
  } finally {
    formSubmitting.value = false
  }
}

async function submitKnowhow() {
  const middleId = Number(selectedMiddleId.value)
  const title = formKnowhowTitle.value.trim()
  const content = formKnowhowContent.value
  if (!title || !content.trim() || Number.isNaN(middleId)) return
  formSubmitting.value = true
  errorMessage.value = null
  try {
    const created = await createKnowhow(middleId, {
      title,
      keywords: formKnowhowKeywords.value,
      content,
    })
    await loadKnowhowsList(middleId)
    selectedKnowhowId.value = String(created.id)
    detail.value = created
    closeModal()
  } catch (e) {
    setError(e)
  } finally {
    formSubmitting.value = false
  }
}
</script>

<template>
  <div class="app">
    <header class="header">
      <div class="header-bar">
        <div class="header-brand">
          <a
            class="header-portal-link"
            href="../m.html"
            aria-label="PORTAL"
          >
            <span class="header-icon-ring header-icon-ring--52">
              <img
                class="header-icon-img"
                :src="headerImg('PORTAL.jpg')"
                width="52"
                height="52"
                alt=""
              />
            </span>
          </a>
          <span class="header-icon-ring header-icon-ring--52" aria-hidden="true">
            <img
              class="header-icon-img"
              :src="headerImg('KNOWHOW.jpg')"
              width="52"
              height="52"
              alt=""
            />
          </span>
          <h1 class="header-title">KNOWHOW管理</h1>
        </div>
        <button type="button" class="header-config-btn" aria-label="設定">
          <span class="header-icon-ring header-icon-ring--34">
            <img
              class="header-icon-img"
              :src="headerImg('CONFIG.jpg')"
              width="34"
              height="34"
              alt=""
            />
          </span>
        </button>
      </div>
    </header>

    <p v-if="errorMessage" class="error" role="alert">{{ errorMessage }}</p>
    <p v-if="busyMajors || busyMiddles || busyKnowhowList || busyDetail" class="loading">
      読み込み中…
    </p>

    <section class="field">
      <label class="label" for="major-select">大項目</label>
      <div class="row">
        <select
          id="major-select"
          v-model="selectedMajorId"
          class="select"
          :disabled="majorDisabled"
        >
          <option value="">選択してください</option>
          <option v-for="m in majors" :key="m.id" :value="String(m.id)">
            {{ m.name }}
          </option>
        </select>
        <button
          type="button"
          class="icon-btn"
          aria-label="大項目を追加"
          :disabled="majorDisabled"
          @click="openModal('major')"
        >
          ＋
        </button>
      </div>
    </section>

    <section class="field">
      <label class="label" for="middle-select">中項目</label>
      <div class="row">
        <select
          id="middle-select"
          v-model="selectedMiddleId"
          class="select"
          :disabled="middleDisabled"
        >
          <option value="">選択してください</option>
          <option v-for="m in middles" :key="m.id" :value="String(m.id)">
            {{ m.name }}
          </option>
        </select>
        <button
          type="button"
          class="icon-btn"
          aria-label="中項目を追加"
          :disabled="middleDisabled"
          @click="openModal('middle')"
        >
          ＋
        </button>
      </div>
    </section>

    <section class="field">
      <label class="label" for="knowhow-select">タイトル（ノウハウ）</label>
      <div class="row">
        <select
          id="knowhow-select"
          v-model="selectedKnowhowId"
          class="select"
          :disabled="knowhowSelectDisabled"
        >
          <option value="">選択してください</option>
          <option v-for="k in knowhowList" :key="k.id" :value="String(k.id)">
            {{ k.title }}
          </option>
        </select>
        <button
          type="button"
          class="icon-btn"
          aria-label="ノウハウを追加"
          :disabled="knowhowSelectDisabled"
          @click="openModal('knowhow')"
        >
          ＋
        </button>
      </div>
    </section>

    <article v-if="detail" class="detail">
      <h2 class="detail-title">{{ detail.title }}</h2>
      <dl class="meta">
        <dt>キーワード</dt>
        <dd>{{ detail.keywords || '—' }}</dd>
        <dt>更新日時</dt>
        <dd>{{ detail.updated_at }}</dd>
        <dt>作成日時</dt>
        <dd>{{ detail.created_at }}</dd>
      </dl>
      <h3 class="content-heading">本文</h3>
      <pre class="content-body">{{ detail.content }}</pre>
    </article>

    <div
      v-if="modal"
      class="modal-backdrop"
      role="presentation"
      @click.self="closeModal"
    >
      <div class="modal" role="dialog" aria-modal="true">
        <template v-if="modal === 'major'">
          <h2 class="modal-title">大項目を追加</h2>
          <label class="label" for="inp-major">名称</label>
          <input id="inp-major" v-model="formMajorName" class="input" type="text" autocomplete="off" />
          <div class="modal-actions">
            <button type="button" class="btn secondary" @click="closeModal">キャンセル</button>
            <button
              type="button"
              class="btn primary"
              :disabled="formSubmitting || !formMajorName.trim()"
              @click="submitMajor"
            >
              追加
            </button>
          </div>
        </template>
        <template v-else-if="modal === 'middle'">
          <h2 class="modal-title">中項目を追加</h2>
          <label class="label" for="inp-middle">名称</label>
          <input id="inp-middle" v-model="formMiddleName" class="input" type="text" autocomplete="off" />
          <div class="modal-actions">
            <button type="button" class="btn secondary" @click="closeModal">キャンセル</button>
            <button
              type="button"
              class="btn primary"
              :disabled="formSubmitting || !formMiddleName.trim()"
              @click="submitMiddle"
            >
              追加
            </button>
          </div>
        </template>
        <template v-else-if="modal === 'knowhow'">
          <h2 class="modal-title">ノウハウを追加</h2>
          <p class="modal-note">
            作成 API は仕様書に未定義のため、POST
            /middle-categories/{id}/knowhows を呼び出します。未実装のサーバーではエラーになります。
          </p>
          <label class="label" for="inp-k-title">タイトル</label>
          <input id="inp-k-title" v-model="formKnowhowTitle" class="input" type="text" autocomplete="off" />
          <label class="label" for="inp-k-kw">キーワード（任意）</label>
          <input id="inp-k-kw" v-model="formKnowhowKeywords" class="input" type="text" autocomplete="off" />
          <label class="label" for="inp-k-content">本文</label>
          <textarea id="inp-k-content" v-model="formKnowhowContent" class="textarea" rows="6" />
          <div class="modal-actions">
            <button type="button" class="btn secondary" @click="closeModal">キャンセル</button>
            <button
              type="button"
              class="btn primary"
              :disabled="formSubmitting || !formKnowhowTitle.trim() || !formKnowhowContent.trim()"
              @click="submitKnowhow"
            >
              追加
            </button>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.app {
  max-width: 32rem;
  margin: 0 auto;
  padding: 0.75rem 1rem 2rem;
  min-height: 100dvh;
  box-sizing: border-box;
}

.header {
  margin-bottom: 1rem;
}

.header-bar {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 0.5rem;
}

.header-brand {
  display: flex;
  align-items: flex-end;
  gap: 0.45rem;
  min-width: 0;
  flex: 1;
}

/* 丸クリップ（四角のまま貼らない） */
.header-icon-ring {
  display: block;
  flex-shrink: 0;
  border-radius: 50%;
  overflow: hidden;
  line-height: 0;
  background: var(--kh-border);
}

.header-icon-ring--52 {
  width: 52px;
  height: 52px;
}

.header-icon-ring--34 {
  width: 34px;
  height: 34px;
}

.header-icon-img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.header-title {
  margin: 0;
  font-size: 26px;
  font-weight: 700;
  line-height: 1;
  letter-spacing: 0.02em;
  min-width: 0;
  word-break: break-word;
}

.header-config-btn {
  flex-shrink: 0;
  margin: 0;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: flex-end;
  line-height: 0;
  -webkit-tap-highlight-color: transparent;
}

.header-config-btn:focus-visible {
  outline: 2px solid var(--kh-accent);
  outline-offset: 2px;
  border-radius: 50%;
}

.header-portal-link {
  flex-shrink: 0;
  display: flex;
  align-items: flex-end;
  line-height: 0;
  text-decoration: none;
  color: inherit;
  -webkit-tap-highlight-color: transparent;
  border-radius: 50%;
}

.header-portal-link:focus-visible {
  outline: 2px solid var(--kh-accent);
  outline-offset: 2px;
}

.error {
  background: #fde8e8;
  color: #9b1c1c;
  padding: 0.6rem 0.75rem;
  border-radius: 8px;
  font-size: 0.875rem;
  margin: 0 0 0.75rem;
}

.loading {
  font-size: 0.875rem;
  color: var(--kh-muted);
  margin: 0 0 0.75rem;
}

.field {
  margin-bottom: 1rem;
}

.label {
  display: block;
  font-size: 0.8rem;
  font-weight: 600;
  margin-bottom: 0.35rem;
  color: var(--kh-label);
}

.row {
  display: flex;
  gap: 0.5rem;
  align-items: stretch;
}

.select {
  flex: 1;
  min-width: 0;
  min-height: 44px;
  padding: 0 0.5rem;
  font-size: 1rem;
  border: 1px solid var(--kh-border);
  border-radius: 8px;
  background: var(--kh-surface);
  color: inherit;
}

.select:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.icon-btn {
  flex-shrink: 0;
  width: 44px;
  min-height: 44px;
  padding: 0;
  font-size: 1.35rem;
  line-height: 1;
  font-weight: 600;
  border: 1px solid var(--kh-border);
  border-radius: 8px;
  background: var(--kh-accent-soft);
  color: var(--kh-accent);
  cursor: pointer;
}

.icon-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.detail {
  margin-top: 1.25rem;
  padding: 1rem;
  border: 1px solid var(--kh-border);
  border-radius: 10px;
  background: var(--kh-surface);
}

.detail-title {
  font-size: 1.1rem;
  margin: 0 0 0.75rem;
  line-height: 1.35;
}

.meta {
  margin: 0 0 1rem;
  font-size: 0.85rem;
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.35rem 0.75rem;
}

.meta dt {
  margin: 0;
  color: var(--kh-muted);
  font-weight: 500;
}

.meta dd {
  margin: 0;
  word-break: break-word;
}

.content-heading {
  font-size: 0.85rem;
  margin: 0 0 0.35rem;
  color: var(--kh-label);
}

.content-body {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: inherit;
  font-size: 0.9rem;
  line-height: 1.5;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 50;
  padding: 0.5rem;
}

@media (min-height: 500px) {
  .modal-backdrop {
    align-items: center;
  }
}

.modal {
  width: 100%;
  max-width: 22rem;
  max-height: 90dvh;
  overflow: auto;
  background: var(--kh-surface);
  border-radius: 12px;
  padding: 1rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.modal-title {
  font-size: 1.05rem;
  margin: 0 0 0.75rem;
}

.modal-note {
  font-size: 0.75rem;
  color: var(--kh-muted);
  margin: 0 0 0.75rem;
  line-height: 1.45;
}

.input,
.textarea {
  width: 100%;
  box-sizing: border-box;
  min-height: 44px;
  padding: 0.5rem 0.6rem;
  font-size: 1rem;
  border: 1px solid var(--kh-border);
  border-radius: 8px;
  margin-bottom: 0.75rem;
  background: var(--kh-bg);
  color: inherit;
}

.textarea {
  min-height: 8rem;
  resize: vertical;
}

.modal-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
  margin-top: 0.5rem;
}

.btn {
  min-height: 44px;
  padding: 0 1rem;
  font-size: 0.95rem;
  border-radius: 8px;
  border: 1px solid transparent;
  cursor: pointer;
}

.btn.primary {
  background: var(--kh-accent);
  color: #fff;
}

.btn.primary:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.btn.secondary {
  background: transparent;
  border-color: var(--kh-border);
  color: inherit;
}
</style>
