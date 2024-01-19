import dynamic from 'next/dynamic'

const BoardDynamic = dynamic(() => import('../components/Featured'), {
    ssr: false,
})

export default function Control() {
    return (
        <div>
            <BoardDynamic />
        </div>
    )
}
