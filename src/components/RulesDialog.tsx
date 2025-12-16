import { Book } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export const RulesDialog = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="gold-outline" className="gap-2">
          <Book className="w-4 h-4" />
          Rules
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl text-foreground">
            Rules of Coup
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 text-muted-foreground">
          <section>
            <h3 className="font-display text-lg text-foreground mb-2">Objective</h3>
            <p>
              Eliminate all other players by forcing them to lose both their influence cards. 
              The last player with influence wins.
            </p>
          </section>

          <section>
            <h3 className="font-display text-lg text-foreground mb-2">Characters</h3>
            <ul className="space-y-2">
              <li><span className="text-primary font-semibold">Duke:</span> Take 3 coins (Tax). Blocks Foreign Aid.</li>
              <li><span className="text-primary font-semibold">Assassin:</span> Pay 3 coins to assassinate another player's influence.</li>
              <li><span className="text-primary font-semibold">Captain:</span> Steal 2 coins from another player. Blocks stealing.</li>
              <li><span className="text-primary font-semibold">Ambassador:</span> Exchange cards with the deck. Blocks stealing.</li>
              <li><span className="text-primary font-semibold">Contessa:</span> Blocks assassination.</li>
            </ul>
          </section>

          <section>
            <h3 className="font-display text-lg text-foreground mb-2">Actions</h3>
            <ul className="space-y-2">
              <li><span className="text-primary font-semibold">Income:</span> Take 1 coin (cannot be blocked).</li>
              <li><span className="text-primary font-semibold">Foreign Aid:</span> Take 2 coins (can be blocked by Duke).</li>
              <li><span className="text-primary font-semibold">Coup:</span> Pay 7 coins to force a player to lose influence (cannot be blocked). Mandatory with 10+ coins.</li>
            </ul>
          </section>

          <section>
            <h3 className="font-display text-lg text-foreground mb-2">Bluffing & Challenges</h3>
            <p>
              You may claim any character's action regardless of your actual cards. 
              Any player can challenge your claim. If challenged:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>If you have the card, the challenger loses an influence and you get a new card.</li>
              <li>If you don't have the card, you lose an influence.</li>
            </ul>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
};
