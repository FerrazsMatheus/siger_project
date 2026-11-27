import {
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore'
import { db } from './firebase'

export function observarNotificacoesLidas(uid, aoAtualizar, aoErro) {
  if (!uid) {
    aoAtualizar(new Set())
    return () => {}
  }

  return onSnapshot(collection(db, 'users', uid, 'notificacoesLidas'), (snapshot) => {
    aoAtualizar(new Set(snapshot.docs.map((item) => item.id)))
  }, aoErro)
}

export async function marcarNotificacoesComoLidas(uid, notificacoes) {
  if (!uid || notificacoes.length === 0) return

  // O limite do Firestore é de 500 operações por lote.
  for (let inicio = 0; inicio < notificacoes.length; inicio += 500) {
    const lote = writeBatch(db)
    notificacoes.slice(inicio, inicio + 500).forEach((notificacao) => {
      lote.set(doc(db, 'users', uid, 'notificacoesLidas', notificacao.id), {
        notificacaoId: notificacao.id,
        visualizadaEm: serverTimestamp(),
      })
    })
    await lote.commit()
  }
}
