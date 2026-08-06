import { useEffect, useState } from "react";
import BottomNav, { type Tab } from "./components/BottomNav";
import MinDagScreen from "./components/screens/MinDagScreen";
import UkeplanScreen from "./components/screens/UkeplanScreen";
import OppskrifterScreen from "./components/screens/OppskrifterScreen";
import ProdukterScreen from "./components/screens/ProdukterScreen";
import HandlelisteScreen from "./components/screens/HandlelisteScreen";
import ViewerPicker from "./components/ViewerPicker";
import { useStore } from "./store/useStore";

function App() {
  const [tab, setTab] = useState<Tab>("dag");
  const { loaded, loadHousehold, viewerPersonId, people } = useStore();

  useEffect(() => {
    loadHousehold();
  }, [loadHousehold]);

  if (!loaded) {
    return (
      <div className="flex h-screen items-center justify-center bg-(--color-cream)">
        <p className="text-[14px] text-(--color-ink-soft)">Laster inn...</p>
      </div>
    );
  }

  if (!viewerPersonId && people.length > 0) {
    return <ViewerPicker />;
  }

  return (
    <div className="mx-auto min-h-full max-w-md bg-(--color-cream)">
      {tab === "dag" && <MinDagScreen goTo={setTab} />}
      {tab === "ukeplan" && <UkeplanScreen />}
      {tab === "oppskrifter" && <OppskrifterScreen />}
      {tab === "produkter" && <ProdukterScreen />}
      {tab === "handleliste" && <HandlelisteScreen />}
      <BottomNav active={tab} onChange={setTab} />
    </div>
  );
}

export default App;
