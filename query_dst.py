
from supabase import create_client

url = "https://qlfwcoktmxekitoxxlhc.supabase.co"
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFsZndjb2t0bXhla2l0b3h4bGhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzcwMDAxOTMsImV4cCI6MjA1MjU3NjE5M30.dTXn8VrSIN1nsZjk86VKj3lteSej10w45H3KP4euHb0"
supabase = create_client(url, key)

def query_dst_offsets():
    try:
        response = supabase.table('dst_offsets') \
            .select('*') \
            .in_('id', [48]) \
            .execute()
            
        print("\nQueried rows:")
        for record in response.data:
            print(f"ID: {record['id']}, City: {record['city']}")
            
    except Exception as e:
        print(f"Error querying database: {str(e)}")

if __name__ == "__main__":
    query_dst_offsets()
