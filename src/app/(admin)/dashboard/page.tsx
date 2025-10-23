import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Dashboard() {
  return (
    <div>
      <Card>
        <CardHeader>
          <CardTitle>Dashboard</CardTitle>
          <CardDescription>Welcome to the Admin Portal.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>This is the main dashboard. More features will be added soon!</p>
        </CardContent>
      </Card>
    </div>
  );
}