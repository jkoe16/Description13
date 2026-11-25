// Firebase 로그인 (Authentication만 사용). 설정값은 공개되어도 되는 웹 앱 설정이라 VITE_로 화면에 넣는다.
import { useEffect, useState } from 'react'
import { initializeApp } from 'firebase/app'
import { getAuth, onAuthStateChanged } from 'firebase/auth'

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const firebaseReady = Boolean(config.apiKey && config.authDomain && config.projectId)
export const auth = firebaseReady ? getAuth(initializeApp(config)) : null
if (auth) auth.languageCode = 'ko'

// 현재 로그인한 사용자. undefined = 아직 확인 중, null = 로그인 안 함
export function useUser() {
  const [user, setUser] = useState(auth ? undefined : null)
  useEffect(() => (auth ? onAuthStateChanged(auth, setUser) : undefined), [])
  return user
}

const MESSAGES = {
  'auth/invalid-email': '이메일 형식을 확인해 주세요.',
  'auth/missing-password': '비밀번호를 입력해 주세요.',
  'auth/weak-password': '비밀번호는 6자 이상으로 정해 주세요.',
  'auth/email-already-in-use': '이미 가입된 이메일이에요. 로그인해 주세요.',
  'auth/invalid-credential': '이메일 또는 비밀번호가 맞지 않아요.',
  'auth/wrong-password': '이메일 또는 비밀번호가 맞지 않아요.',
  'auth/user-not-found': '이메일 또는 비밀번호가 맞지 않아요.',
  'auth/too-many-requests': '시도가 너무 많아요. 잠시 뒤에 다시 해 주세요.',
  'auth/network-request-failed': '인터넷 연결을 확인해 주세요.',
  'auth/popup-closed-by-user': '로그인 창이 닫혔어요. 다시 시도해 주세요.',
  'auth/cancelled-popup-request': '로그인 창이 닫혔어요. 다시 시도해 주세요.',
  'auth/unauthorized-domain': '이 주소는 Firebase 로그인 허용 도메인에 아직 없어요.',
  'auth/operation-not-allowed': '이 로그인 방식이 Firebase에서 아직 켜져 있지 않아요.',
  'auth/account-exists-with-different-credential': '같은 이메일로 다른 방식으로 가입한 계정이 있어요. 그 방식으로 로그인해 주세요.',
}
export const authMessage = (e) => MESSAGES[e?.code] || '문제가 생겼어요. 잠시 뒤에 다시 시도해 주세요.'
