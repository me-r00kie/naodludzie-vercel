import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'NaOdludzie - Domki na odludziu | Rezerwacja miejsc z dala od cywilizacji',
  description: 'Odkryj domki w najbardziej odosobnionych zakątkach Polski. NaOdludzie to marketplace dla poszukiwaczy spokoju - znajdź idealne miejsce do odpoczynku',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <div id="root">{children}</div>
      </body>
    </html>
  )
}
