// 마음 대화 서버 주소.
// 화면을 잠들지 않는 정적 사이트에서 따로 열 때는 빌드 환경변수 VITE_API_BASE에 서버 주소를 넣는다
// (예: https://maeumgyeot-vmm0.onrender.com). 비어 있으면 화면과 같은 곳의 /api를 쓴다.
const BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/+$/, '')

export const api = (path) => BASE + path
