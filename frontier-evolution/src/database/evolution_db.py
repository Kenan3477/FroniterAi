class EvolutionDB:
    def __init__(self, db_connection):
        self.db_connection = db_connection

    def save_evolution_data(self, evolution_data):
        with self.db_connection.cursor() as cursor:
            cursor.execute(
                "INSERT INTO evolution_data (timestamp, changes, metrics) VALUES (%s, %s, %s)",
                (evolution_data['timestamp'], evolution_data['changes'], evolution_data['metrics'])
            )
        self.db_connection.commit()

    def retrieve_evolution_data(self, start_time, end_time):
        with self.db_connection.cursor() as cursor:
            cursor.execute(
                "SELECT * FROM evolution_data WHERE timestamp BETWEEN %s AND %s",
                (start_time, end_time)
            )
            return cursor.fetchall()