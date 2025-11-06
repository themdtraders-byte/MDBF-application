
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Icons } from "@/components/icons";

export default function OfflinePage() {
    return (
        <div className="flex items-center justify-center min-h-screen bg-background">
            <Card className="max-w-md text-center">
                <CardHeader>
                    <div className="flex justify-center mb-4">
                        <Icons.alertTriangle className="w-12 h-12 text-destructive" />
                    </div>
                    <CardTitle>You are Offline</CardTitle>
                    <CardDescription>
                        It looks like you've lost your internet connection.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p>
                        Don't worry, you can continue to use the application. Your data is stored locally and will sync when you're back online (if applicable).
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
