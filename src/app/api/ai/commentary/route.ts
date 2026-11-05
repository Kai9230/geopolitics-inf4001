export async function POST(): Promise<Response> {
  return Response.json(
    {
      error:
        "Commentary is generated through authenticated saved campaign exchanges.",
    },
    { status: 410 },
  );
}
