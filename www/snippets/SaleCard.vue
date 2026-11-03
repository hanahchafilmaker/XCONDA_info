<!-- Nuxt 4 이관 예시. 실제 메인에 적용한 파일이 아닙니다. -->
<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from "vue"
import { mountSaleCard } from "./sale-card.js"
import "./sale-card.css"

// 같은 행사임을 확인한 기존 NoticePopup의 id만 전달합니다.
const props = defineProps({
  previousNoticeId: { type: String, default: "" }
})

const { locale } = useI18n()
const localePath = useLocalePath()
const slot = ref(null)
let dispose = null

function renderCard() {
  dispose?.()
  dispose = null
  if (!slot.value) return
  dispose = mountSaleCard(slot.value, {
    locale: locale.value,
    pricingHref: localePath("/pricing"),
    legacyHideUntilKey: props.previousNoticeId ? `popupHide:${props.previousNoticeId}` : undefined
  })
}

onMounted(renderCard)
watch(() => [locale.value, props.previousNoticeId], renderCard)
onBeforeUnmount(() => dispose?.())
</script>

<template>
  <div ref="slot" />
</template>
