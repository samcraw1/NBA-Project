import sys

from awsglue.context import GlueContext
from awsglue.job import Job
from awsglue.utils import getResolvedOptions
from pyspark.context import SparkContext
from pyspark.sql.functions import col

# Set up the Spark and Glue job contexts. Glue runs this script with JOB_NAME supplied.
args = getResolvedOptions(sys.argv, ["JOB_NAME"])
sc = SparkContext.getOrCreate()
glue_context = GlueContext(sc)
spark = glue_context.spark_session
job = Job(glue_context)
job.init(args["JOB_NAME"], args)

# Read the CSV files from this S3 prefix into a Spark DataFrame.
# The header option tells Spark to use the first row of each file as column names.
df = spark.read.option("header", "true").csv("s3://nba-project-data-506726968427/processed/player_game_stats/")

# CSV values start as strings by default. Keep IDs and labels as strings,
# and cast the numeric stats to the types we want in the curated output.
int_columns = [  "fgm", "fga",
    "fg3m", "fg3a",
    "ftm", "fta",
    "oreb", "dreb", "reb",
    "ast", "stl", "blk",
    "tov", "pf",
    "pts", "plus_minus",
]


double_columns = [ "min", "fg_pct", "fg3_pct","ft_pct", "fantasy_pts"]

# These columns contain True/False values in the CSV.
boolean_columns = ["is_home", "zero_minutes"]

# Convert whole-number stats to integers.
for name in int_columns:
    df = df.withColumn(name, col(name).cast("int"))

# Convert playing time, percentages, and fantasy points to decimal numbers.
for number in double_columns:
    df = df.withColumn(number, col(number).cast("double"))

# Convert the boolean flags from text to true/false values.
for name in boolean_columns:
    df = df.withColumn(name, col(name).cast("boolean"))

# Print the resulting column names and types, then preview five rows.
# These lines help us inspect the transformed DataFrame during development.
filtered_data = df.filter(col("pts").isNull()).count()

if filtered_data > 0:
    raise ValueError(f"Found {filtered_data} rows with missing points")


df.printSchema()
df.show(5, truncate=False)

# Write the typed DataFrame as Parquet to a separate S3 prefix.
# errorifexists prevents this practice job from replacing existing output.
output_path = "s3://nba-project-data-506726968427/curated/player_game_stats_parquet_practice2/"
df.write.mode("errorifexists").parquet(output_path)

# Mark successful completion so Glue can record the run state.
job.commit()

