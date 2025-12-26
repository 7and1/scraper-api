import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Book, MessageCircle, Play } from "lucide-react";

export function QuickActions() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Link href="/playground" className="block">
          <Button
            variant="outline"
            className="w-full justify-start"
            leftIcon={<Play className="h-4 w-4" />}
          >
            Test in Playground
          </Button>
        </Link>
        <Link href="/docs" className="block">
          <Button
            variant="outline"
            className="w-full justify-start"
            leftIcon={<Book className="h-4 w-4" />}
          >
            Read Documentation
          </Button>
        </Link>
        <Link href="/support" className="block">
          <Button
            variant="outline"
            className="w-full justify-start"
            leftIcon={<MessageCircle className="h-4 w-4" />}
          >
            Get Support
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
