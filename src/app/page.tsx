import dynamic from 'next/dynamic'

const BoardDynamic = dynamic(() => import('./components/Main'), {
  ssr: false,
})

export default function Main() {
  return (
    <div>
      <BoardDynamic />
    </div>
  )
}