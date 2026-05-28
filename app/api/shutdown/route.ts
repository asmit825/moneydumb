export async function POST() {
  return Response.json({ 
    success: true, 
    message: 'Shutdown command simulated successfully. (Connection safely paused)' 
  });
}
