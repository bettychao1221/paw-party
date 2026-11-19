// 會員檔 members/{uid}：email、createdAt（＋管理員專用 adminNote）
import {
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import type { User } from "firebase/auth";
import { db } from "@/lib/firebase";
import { text, toDate } from "@/lib/fsValue";

export type Member = {
  uid: string;
  email: string;
  createdAt: Date | null;
  adminNote: string;
};

export const MEMBER_NOTE_LIMIT = 1000;

// 客人登入後：沒有自己的會員檔就自動建立
export async function ensureMember(user: User): Promise<void> {
  const ref = doc(db, "members", user.uid);
  const snapshot = await getDoc(ref);
  if (snapshot.exists() || !user.email) return;
  await setDoc(ref, { email: user.email, createdAt: serverTimestamp() });
}

// ---- 以下為後台使用 ----

export async function fetchMembers(): Promise<Member[]> {
  const snapshot = await getDocs(collection(db, "members"));
  return snapshot.docs
    .map((d) => ({
      uid: d.id,
      email: text(d.data().email),
      createdAt: toDate(d.data().createdAt),
      adminNote: text(d.data().adminNote),
    }))
    .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
}

export async function fetchMember(uid: string): Promise<Member | null> {
  const snapshot = await getDoc(doc(db, "members", uid));
  if (!snapshot.exists()) return null;
  const data = snapshot.data();
  return {
    uid,
    email: text(data.email),
    createdAt: toDate(data.createdAt),
    adminNote: text(data.adminNote),
  };
}

export async function saveMemberAdminNote(uid: string, note: string): Promise<void> {
  await updateDoc(doc(db, "members", uid), { adminNote: note });
}
