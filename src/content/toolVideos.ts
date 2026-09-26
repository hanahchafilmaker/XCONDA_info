import type { Lang } from "../i18n/dict";

/**
 * 툴별 공식 영상 가이드 (Google Drive · xconda_video_guide 폴더).
 * KO / EN 각각 별도 영상이 있으며, 가이드 모달 최상단에 임베드됩니다.
 */
const drive = (id: string) => `https://drive.google.com/file/d/${id}/preview`;

export const TOOL_VIDEOS: Partial<Record<string, Record<Lang, string>>> = {
  image: {
    ko: drive("1NyAQw0hGUxapnS__DHECfYebQO7F-H9D"),
    en: drive("1iGejB3PNJEbsCyvIt7V_gW6RN2N-OJ4m"),
  },
  video: {
    ko: drive("1yo8OxQLwrXljwCzhVnkNOMHWp5TRvtrV"),
    en: drive("1GswLRqjC4bzbRlrknDhq_6jBDhwi5tCm"),
  },
  upscale: {
    ko: drive("1KcumCH4MRqGVb1ITf3uJXX_YHrhBzZAY"),
    en: drive("14fWiRiNoXJWwwJzW3jNoAokUXBc-vidl"),
  },
  "face-swap": {
    ko: drive("11RSvqoewsriDWdfncKRiEccxS-KhnBEB"),
    en: drive("1dCt_WVGxsD5eQRhdlh6IfUb3hLiHhSdT"),
  },
  "auto-angle": {
    ko: drive("1iM8HlUaPy5SAmr3pBmyOlp1Q3gg4sfBn"),
    en: drive("1qa7jph8VqFXY2wj_B8Zq8ydB3V27qklM"),
  },
  "background-blend": {
    ko: drive("1GDZYg68oocR4ooBkBM07dS0mMpu9G7fe"),
    en: drive("1oVAuZicTy2C5d9-4QavANdM4zEhxeXwh"),
  },
  expression: {
    ko: drive("1LBloYy4hBBAdJoVn7AC7IOi6uJRkt0uc"),
    en: drive("178uq4-XWgUyCEwoTTZYkNFc4MlOi7g9B"),
  },
  "directors-cut": {
    ko: drive("1ccAtpVYeNOYZ3lRVOVQbgOsKsPEGsdKR"),
    en: drive("14boecV98spjkphljXesBIVZvrMUUNkjD"),
  },
  "art-director-pro": {
    ko: drive("1yJuyYID0kty92oxFDSD1B1ZjXG4U79Z-"),
    en: drive("1tdlUUZYF0A5ZGrOgG89W83Znby3HDF7q"),
  },
  "scene-snap": {
    ko: drive("1NO2dUo-dDnktFVGZCSQRSQ5Z62SSBoB-"),
    en: drive("1iLHSCoHPgdgPSNgPs9hP3qvqWkDuoWRl"),
  },
  "cloth-swap": {
    ko: drive("1hBL76djB-KM_XVl6H5Ype3nkaibRjF0w"),
    en: drive("1uakGh6YhClj8_xncHrFMgJTP7rgPPxn5"),
  },
  "youtube-ref": {
    ko: drive("1gCR6j9qGTIyYJ77X6n9TGZBW_tR_QApX"),
    en: drive("1okP5rJGnpaxk2O4watgp--ZlmPRErZFH"),
  },
  "spin-angle": {
    ko: drive("1-7teTTwC6_IKKW03byC96nMM3h4Duaiz"),
    en: drive("1agouapJDmMJmDHEVIKjOhQfvNzxd02js"),
  },
  "cine-grade": {
    ko: drive("1iyoz1rlyf59lDs_sKmCldKMUrVdRj6k5"),
    en: drive("1DN5GnikZWZQP52zlF7jMbQYtvo_8kMRZ"),
  },
  "arw-view": {
    ko: drive("1xCns-wJeab7OGg8m85bQo6iBU4ez-EAL"),
    en: drive("11HehzKyXKk3RsTs5munQRBfWV5Gza1Rk"),
  },
  "drct-seq": {
    ko: drive("14EhJvRfFec07Gne6ipg-Pl4ibVHRBHtW"),
    en: drive("1I4BANUYEtnqBj-zD_TdsCUomXVpzCTr-"),
  },
  turn: {
    ko: drive("1lZiB_4qQmauht-zfNdYDFo3LHg3FWZX_"),
    en: drive("1h9db77JK1PXjTFnO2JbVeJuHd28JiHCA"),
  },
};

export function getToolVideo(slug: string, lang: Lang): string | undefined {
  return TOOL_VIDEOS[slug]?.[lang];
}
