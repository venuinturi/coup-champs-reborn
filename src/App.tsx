import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import CoupIndex from "./pages/CoupIndex";
import PokerIndex from "./pages/PokerIndex";
import BlackjackIndex from "./pages/BlackjackIndex";
import RummyIndex from "./pages/RummyIndex";
import Game from "./pages/Game";
import Room from "./pages/Room";
import MultiplayerGame from "./pages/MultiplayerGame";
import PokerRoom from "./pages/PokerRoom";
import PokerGame from "./pages/PokerGame";
import BlackjackRoom from "./pages/BlackjackRoom";
import BlackjackGame from "./pages/BlackjackGame";
import RummyRoom from "./pages/RummyRoom";
import RummyGame from "./pages/RummyGame";
import TestPage from "./pages/TestPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          {/* Coup Routes */}
          <Route path="/coup" element={<CoupIndex />} />
          <Route path="/coup/game" element={<Game />} />
          <Route path="/coup/room/:roomCode" element={<Room />} />
          <Route path="/coup/multiplayer" element={<MultiplayerGame />} />
          <Route path="/coup/test" element={<TestPage />} />
          {/* Poker Routes */}
          <Route path="/poker" element={<PokerIndex />} />
          <Route path="/poker/room/:roomCode" element={<PokerRoom />} />
          <Route path="/poker/game/:roomCode" element={<PokerGame />} />
          {/* Blackjack Routes */}
          <Route path="/blackjack" element={<BlackjackIndex />} />
          <Route path="/blackjack/room/:roomCode" element={<BlackjackRoom />} />
          <Route path="/blackjack/game/:roomCode" element={<BlackjackGame />} />
          {/* Rummy Routes */}
          <Route path="/rummy" element={<RummyIndex />} />
          <Route path="/rummy/room/:roomCode" element={<RummyRoom />} />
          <Route path="/rummy/game/:roomCode" element={<RummyGame />} />
          {/* Legacy routes */}
          <Route path="/game" element={<Game />} />
          <Route path="/room/:roomCode" element={<Room />} />
          <Route path="/multiplayer" element={<MultiplayerGame />} />
          <Route path="/test" element={<TestPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
