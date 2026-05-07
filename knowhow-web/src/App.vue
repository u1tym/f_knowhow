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
  searchKnowhowsByKeywords,
  swapKnowhowDisplayOrder,
  deleteKnowhow,
  updateKnowhow,
} from './api/knowhow-api'
import type {
  KnowhowDetail,
  KnowhowListItem,
  KnowhowSearchResultItem,
  MajorCategory,
  MiddleCategory,
} from './api/types'
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
const busyKeywordSearch = ref(false)
const busyReorder = ref(false)
const busyDetail = ref(false)
const errorMessage = ref<string | null>(null)
const keywordQuery = ref('')
const searchedKnowhowList = ref<KnowhowSearchResultItem[]>([])
const keywordSearchExecuted = ref(false)
const detailMajorName = ref('')
const detailMiddleName = ref('')

const modal = ref<'major' | 'middle' | 'knowhow' | null>(null)
const formMajorName = ref('')
const formMiddleName = ref('')
const formKnowhowTitle = ref('')
const formKnowhowKeywords = ref('')
const formKnowhowContent = ref('')
const formSubmitting = ref(false)
/** ノウハウモーダル: null なら新規、数値なら該当 ID を更新 */
const editingKnowhowId = ref<number | null>(null)
const reorderMode = ref(false)

const majorDisabled = computed(() => busyMajors.value)
const middleDisabled = computed(() => !selectedMajorId.value || busyMiddles.value)
const knowhowListActionsDisabled = computed(() => !selectedMiddleId.value || busyKnowhowList.value)
const keywordTerms = computed(() =>
  keywordQuery.value
    .trim()
    .split(/[,\uFF0C]+/)
    .map((v) => v.trim())
    .filter(Boolean),
)
const keywordSearchMode = computed(() => keywordTerms.value.length > 0)
const searchingBusy = computed(() => busyKnowhowList.value || busyKeywordSearch.value || busyReorder.value)
const canUseConfigButton = computed(
  () => !!detail.value || (!!selectedMiddleId.value && !keywordSearchMode.value),
)

const selectedMajorName = computed(
  () => majors.value.find((m) => String(m.id) === selectedMajorId.value)?.name ?? '',
)
const selectedMiddleName = computed(
  () => middles.value.find((m) => String(m.id) === selectedMiddleId.value)?.name ?? '',
)

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

async function loadKnowhowsByKeywords(keywords: string[]) {
  if (keywords.length === 0) {
    searchedKnowhowList.value = []
    return
  }
  busyKeywordSearch.value = true
  errorMessage.value = null
  try {
    searchedKnowhowList.value = await searchKnowhowsByKeywords(keywords)
  } catch (e) {
    setError(e)
    searchedKnowhowList.value = []
  } finally {
    busyKeywordSearch.value = false
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
  if (keywordSearchMode.value) return
  reorderMode.value = false
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
  if (keywordSearchMode.value) return
  reorderMode.value = false
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

function clearKeywordSearch() {
  reorderMode.value = false
  keywordSearchExecuted.value = false
  searchedKnowhowList.value = []
}

function clearKeywordInput() {
  keywordQuery.value = ''
  clearKeywordSearch()
}

async function submitKeywordSearch() {
  selectedKnowhowId.value = ''
  detail.value = null
  keywordSearchExecuted.value = true
  if (keywordTerms.value.length === 0) {
    searchedKnowhowList.value = []
    return
  }
  await loadKnowhowsByKeywords(keywordTerms.value)
}

onMounted(() => {
  void loadMajors()
})

function backToKnowhowList() {
  selectedKnowhowId.value = ''
}

function onConfigClick() {
  if (detail.value) {
    openKnowhowEdit()
    return
  }
  if (!canUseConfigButton.value) return
  reorderMode.value = !reorderMode.value
}

function openKnowhowFromCategoryList(item: KnowhowListItem) {
  detailMajorName.value = selectedMajorName.value
  detailMiddleName.value = selectedMiddleName.value
  selectedKnowhowId.value = String(item.id)
}

function openKnowhowFromKeywordSearch(item: KnowhowSearchResultItem) {
  reorderMode.value = false
  detailMajorName.value = item.major_category_name ?? ''
  detailMiddleName.value = item.middle_category_name ?? ''
  selectedKnowhowId.value = String(item.knowhow_id)
}

async function moveKnowhow(itemId: number, direction: 'up' | 'down') {
  if (keywordSearchMode.value) return
  const middleId = Number(selectedMiddleId.value)
  if (Number.isNaN(middleId)) return
  const idx = knowhowList.value.findIndex((k) => k.id === itemId)
  if (idx < 0) return
  const targetIdx = direction === 'up' ? idx - 1 : idx + 1
  if (targetIdx < 0 || targetIdx >= knowhowList.value.length) return
  const target = knowhowList.value[targetIdx]

  busyReorder.value = true
  errorMessage.value = null
  try {
    await swapKnowhowDisplayOrder(itemId, target.id)
    await loadKnowhowsList(middleId)
  } catch (e) {
    setError(e)
  } finally {
    busyReorder.value = false
  }
}

async function removeKnowhow(item: KnowhowListItem) {
  const middleId = Number(selectedMiddleId.value)
  if (Number.isNaN(middleId)) return
  const confirmed = window.confirm(`「${item.title}」を削除します。よろしいですか？`)
  if (!confirmed) return

  busyReorder.value = true
  errorMessage.value = null
  try {
    await deleteKnowhow(item.id)
    await loadKnowhowsList(middleId)
  } catch (e) {
    setError(e)
  } finally {
    busyReorder.value = false
  }
}

function openModal(which: 'major' | 'middle' | 'knowhow') {
  errorMessage.value = null
  modal.value = which
  formMajorName.value = ''
  formMiddleName.value = ''
  formKnowhowTitle.value = ''
  formKnowhowKeywords.value = ''
  formKnowhowContent.value = ''
  if (which === 'knowhow') {
    editingKnowhowId.value = null
  }
}

function openKnowhowEdit() {
  const d = detail.value
  if (!d) return
  errorMessage.value = null
  editingKnowhowId.value = d.id
  modal.value = 'knowhow'
  formKnowhowTitle.value = d.title
  formKnowhowKeywords.value = d.keywords ?? ''
  formKnowhowContent.value = d.content
}

function closeModal() {
  modal.value = null
  editingKnowhowId.value = null
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
  const currentMiddleId = detail.value?.middle_category_id ?? null
  const selectedMiddle = selectedMiddleId.value ? Number(selectedMiddleId.value) : Number.NaN
  const middleId = editingKnowhowId.value != null
    ? (Number.isNaN(selectedMiddle) ? currentMiddleId : selectedMiddle)
    : selectedMiddle
  const title = formKnowhowTitle.value.trim()
  const content = formKnowhowContent.value.trim()
  if (!title || !content.trim() || middleId == null || Number.isNaN(middleId)) return
  const keywords = formKnowhowKeywords.value.trim() || null
  formSubmitting.value = true
  errorMessage.value = null
  try {
    const editId = editingKnowhowId.value
    if (editId != null) {
      const updated = await updateKnowhow(editId, {
        title,
        keywords,
        content,
        middle_category_id: middleId,
      })
      if (keywordSearchExecuted.value) {
        await loadKnowhowsByKeywords(keywordTerms.value)
      } else {
        await loadKnowhowsList(middleId)
      }
      if (!keywordSearchExecuted.value) {
        detailMajorName.value = selectedMajorName.value
        detailMiddleName.value = selectedMiddleName.value
      }
      selectedKnowhowId.value = String(updated.id)
      detail.value = updated
    } else {
      const created = await createKnowhow({
        title,
        keywords,
        content,
        middle_category_id: middleId,
      })
      await loadKnowhowsList(middleId)
      detailMajorName.value = selectedMajorName.value
      detailMiddleName.value = selectedMiddleName.value
      selectedKnowhowId.value = String(created.id)
      detail.value = created
    }
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
            href="/mobile/login/#/menu"
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
          <h1 class="header-title">KNOWHOW</h1>
        </div>
        <button
          type="button"
          class="header-config-btn"
          :disabled="!canUseConfigButton || busyReorder || busyKeywordSearch || busyKnowhowList"
          aria-label="設定"
          @click="onConfigClick"
        >
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
    <p v-if="busyMajors || busyMiddles || busyKnowhowList || busyKeywordSearch || busyDetail" class="loading">
      読み込み中…
    </p>

    <div v-if="!detail" class="browse-shell">
      <div class="browse-filters">
        <section class="field field--browse-filter">
          <form class="keyword-search-form" @submit.prevent="submitKeywordSearch">
            <label class="label" for="keyword-search">キーワード検索</label>
            <div class="row">
              <input
                id="keyword-search"
                v-model="keywordQuery"
                class="search-input"
                type="text"
                autocomplete="off"
                placeholder="キーワードを入力（複数はカンマ区切り）"
                aria-label="キーワード検索"
                @input="clearKeywordSearch"
              />
              <button type="submit" class="btn-icon" :disabled="busyKeywordSearch" aria-label="検索">
                <svg class="btn-icon__svg" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M10.5 4a6.5 6.5 0 1 0 4.03 11.6l4.44 4.44a1 1 0 0 0 1.41-1.41l-4.43-4.43A6.5 6.5 0 0 0 10.5 4zm0 2a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9z"
                    fill="currentColor"
                  />
                </svg>
              </button>
              <button
                type="button"
                class="btn-icon"
                :disabled="busyKeywordSearch || (!keywordQuery.trim() && !keywordSearchExecuted)"
                aria-label="キーワードをクリア"
                @click="clearKeywordInput"
              >
                <svg class="btn-icon__svg" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M17.66 3.29a1 1 0 0 1 1.41 0l1.64 1.64a1 1 0 0 1 0 1.41L10.04 17.01a1 1 0 0 1-.7.29H6.7a1 1 0 0 1-1-1v-2.64a1 1 0 0 1 .29-.7L17.66 3.29zM5 19h14a1 1 0 1 1 0 2H5a1 1 0 1 1 0-2z"
                    fill="currentColor"
                  />
                </svg>
              </button>
            </div>
          </form>
        </section>

        <template v-if="!keywordSearchMode">
        <section class="field field--browse-filter">
          <div class="row">
            <select
              id="major-select"
              v-model="selectedMajorId"
              class="select"
              :class="{ 'select--empty': selectedMajorId === '' }"
              :disabled="majorDisabled"
              aria-label="大項目"
            >
              <option value="" disabled hidden>大項目</option>
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

        <section class="field field--browse-filter">
          <div class="row">
            <select
              id="middle-select"
              v-model="selectedMiddleId"
              class="select"
              :class="{ 'select--empty': selectedMiddleId === '' }"
              :disabled="middleDisabled"
              aria-label="中項目"
            >
              <option value="" disabled hidden>中項目</option>
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
        </template>
      </div>

      <div v-if="keywordSearchMode || selectedMiddleId || keywordSearchExecuted" class="browse-list-panel">
        <div class="browse-list-scroll">
          <p
            v-if="keywordSearchExecuted && !busyKeywordSearch && searchedKnowhowList.length === 0"
            class="knowhow-list-empty"
          >
            キーワードに一致するノウハウがありません。
          </p>
          <p
            v-else-if="!keywordSearchMode && !busyKnowhowList && knowhowList.length === 0"
            class="knowhow-list-empty"
          >
            この中項目にはノウハウがありません。
          </p>
          <ul v-else-if="keywordSearchExecuted" class="knowhow-list" aria-label="検索結果一覧">
            <li v-for="k in searchedKnowhowList" :key="k.knowhow_id" class="knowhow-list__item">
              <button
                type="button"
                class="knowhow-list__btn"
                :disabled="searchingBusy"
                @click="openKnowhowFromKeywordSearch(k)"
              >
                {{ k.title }}
                <span class="knowhow-list__meta">
                  {{ k.major_category_name ?? '未分類' }} / {{ k.middle_category_name ?? '未分類' }}
                </span>
              </button>
            </li>
          </ul>
          <ul v-else class="knowhow-list" aria-label="ノウハウ一覧">
            <li v-for="k in knowhowList" :key="k.id" class="knowhow-list__item">
              <div class="knowhow-list__row">
                <button
                  type="button"
                  class="knowhow-list__btn"
                  :disabled="searchingBusy"
                  @click="openKnowhowFromCategoryList(k)"
                >
                  {{ k.title }}
                </button>
                <div v-if="reorderMode" class="reorder-actions">
                  <button
                    type="button"
                    class="btn-arrow"
                    aria-label="上へ移動"
                    :disabled="searchingBusy || knowhowList[0]?.id === k.id"
                    @click="moveKnowhow(k.id, 'up')"
                  >
                    <svg class="btn-arrow__icon" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M12 4l6 7h-4v9h-4v-9H6l6-7z" fill="currentColor" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    class="btn-arrow"
                    aria-label="下へ移動"
                    :disabled="searchingBusy || knowhowList[knowhowList.length - 1]?.id === k.id"
                    @click="moveKnowhow(k.id, 'down')"
                  >
                    <svg class="btn-arrow__icon" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M12 20l-6-7h4V4h4v9h4l-6 7z" fill="currentColor" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    class="btn-arrow btn-arrow--danger"
                    aria-label="削除"
                    :disabled="searchingBusy"
                    @click="removeKnowhow(k)"
                  >
                    <svg class="btn-arrow__icon" viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        d="M9 3h6l1 2h4v2H4V5h4l1-2zm-2 6h2v9H7V9zm4 0h2v9h-2V9zm4 0h2v9h-2V9z"
                        fill="currentColor"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </li>
          </ul>
        </div>
        <button
          v-if="!keywordSearchMode"
          type="button"
          class="icon-btn icon-btn--browse-add"
          aria-label="ノウハウを追加"
          :disabled="knowhowListActionsDisabled"
          @click="openModal('knowhow')"
        >
          ＋
        </button>
      </div>
    </div>

    <article v-if="detail" class="detail detail--scroll">
      <button type="button" class="btn-back" @click="backToKnowhowList">一覧に戻る</button>
      <div class="detail-header">
        <h2 class="detail-title">{{ detail.title }}</h2>
      </div>
      <dl class="meta">
        <dt>大項目</dt>
        <dd>{{ detailMajorName || '—' }}</dd>
        <dt>中項目</dt>
        <dd>{{ detailMiddleName || '—' }}</dd>
        <dt>キーワード</dt>
        <dd>{{ detail.keywords || '—' }}</dd>
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
          <h2 class="modal-title">
            {{ editingKnowhowId != null ? 'ノウハウを編集' : 'ノウハウを追加' }}
          </h2>
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
              {{ editingKnowhowId != null ? '更新' : '追加' }}
            </button>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  max-width: 32rem;
  margin: 0 auto;
  padding: 0.75rem 1rem 2rem;
  min-height: 100dvh;
  height: 100dvh;
  overflow: hidden;
  box-sizing: border-box;
}

.header {
  flex-shrink: 0;
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

.header-config-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
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
  flex-shrink: 0;
  background: #fde8e8;
  color: #9b1c1c;
  padding: 0.6rem 0.75rem;
  border-radius: 8px;
  font-size: 0.875rem;
  margin: 0 0 0.75rem;
}

.loading {
  flex-shrink: 0;
  font-size: 0.875rem;
  color: var(--kh-muted);
  margin: 0 0 0.75rem;
}

.field {
  margin-bottom: 1rem;
}

.field--browse-filter {
  margin-bottom: 0.65rem;
}

.field--browse-filter:last-child {
  margin-bottom: 0;
}

.search-input {
  flex: 1;
  min-width: 0;
  width: 100%;
  min-height: 44px;
  padding: 0.5rem 0.6rem;
  font-size: 1rem;
  border: 1px solid var(--kh-border);
  border-radius: 8px;
  background: var(--kh-surface);
  color: inherit;
}

.keyword-search-form {
  margin: 0;
}

.btn-icon {
  flex-shrink: 0;
  width: 44px;
  min-height: 44px;
  padding: 0;
  border-radius: 8px;
  border: 1px solid var(--kh-border);
  background: var(--kh-accent-soft);
  color: var(--kh-accent);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.btn-icon:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.btn-icon__svg {
  width: 22px;
  height: 22px;
}

.browse-shell {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.browse-filters {
  flex-shrink: 0;
}

.browse-list-panel {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: row;
  align-items: stretch;
  gap: 0.5rem;
}

.browse-list-scroll {
  flex: 1;
  min-width: 0;
  overflow-y: auto;
  overscroll-behavior-y: contain;
  -webkit-overflow-scrolling: touch;
  padding-bottom: 0.25rem;
}

.icon-btn--browse-add {
  align-self: flex-start;
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

/* 未選択時はプレースホルダー風（<option disabled hidden> の文言） */
.select--empty:not(:disabled) {
  color: var(--kh-muted);
}

.select option {
  color: #1a1a1a;
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

.knowhow-list-empty {
  margin: 0;
  padding: 0.65rem 0.75rem;
  font-size: 0.9rem;
  color: var(--kh-muted);
  border: 1px dashed var(--kh-border);
  border-radius: 8px;
  line-height: 1.45;
}

.knowhow-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.knowhow-list__item {
  margin: 0;
}

.knowhow-list__row {
  display: flex;
  gap: 0.45rem;
  align-items: stretch;
}

.knowhow-list__btn {
  flex: 1;
  width: 100%;
  box-sizing: border-box;
  min-height: 44px;
  padding: 0.5rem 0.65rem;
  font-size: 1rem;
  text-align: left;
  border: 1px solid var(--kh-border);
  border-radius: 8px;
  background: var(--kh-surface);
  color: inherit;
  cursor: pointer;
  word-break: break-word;
  line-height: 1.35;
  -webkit-tap-highlight-color: transparent;
}

.reorder-actions {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.btn-arrow {
  width: 44px;
  min-height: 0;
  height: 28px;
  padding: 0;
  border: 1px solid var(--kh-border);
  border-radius: 8px;
  background: var(--kh-surface);
  color: var(--kh-accent);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.btn-arrow:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn-arrow__icon {
  width: 16px;
  height: 16px;
}

.btn-arrow--danger {
  color: #b91c1c;
}

.btn-arrow:focus-visible {
  outline: 2px solid var(--kh-accent);
  outline-offset: 1px;
}

.knowhow-list__meta {
  display: block;
  margin-top: 0.2rem;
  font-size: 0.8rem;
  color: var(--kh-muted);
}

.knowhow-list__btn:hover:not(:disabled) {
  background: var(--kh-accent-soft);
}

.knowhow-list__btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.knowhow-list__btn:focus-visible {
  outline: 2px solid var(--kh-accent);
  outline-offset: 2px;
}

.detail {
  margin-top: 1.25rem;
  padding: 1rem;
  border: 1px solid var(--kh-border);
  border-radius: 10px;
  background: var(--kh-surface);
}

.detail--scroll {
  flex: 1;
  min-height: 0;
  margin-top: 0.75rem;
  overflow-y: auto;
  overscroll-behavior-y: contain;
  -webkit-overflow-scrolling: touch;
}

.btn-back {
  display: block;
  width: 100%;
  margin: 0 0 0.85rem;
  min-height: 44px;
  padding: 0 0.75rem;
  font-size: 0.95rem;
  font-weight: 600;
  border-radius: 8px;
  border: 1px solid var(--kh-border);
  background: var(--kh-surface);
  color: var(--kh-accent);
  cursor: pointer;
}

.btn-back:focus-visible {
  outline: 2px solid var(--kh-accent);
  outline-offset: 2px;
}

.detail-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.detail-title {
  font-size: 1.1rem;
  margin: 0;
  line-height: 1.35;
  flex: 1;
  min-width: 0;
  word-break: break-word;
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
