import MainLayout from './components/MainLayout'
import HackathonList from './components/HackathonList'

function App() {
  return (
    <MainLayout>
       <h1 className="text-2xl font-semibold mb-4">Hackathon Aggregator</h1>
      <HackathonList />
    </MainLayout>
  )
}

export default App
