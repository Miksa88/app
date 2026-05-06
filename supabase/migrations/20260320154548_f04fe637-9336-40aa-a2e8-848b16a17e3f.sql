
CREATE TABLE public.daily_nutrition_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  log_date DATE NOT NULL,
  calories_consumed NUMERIC NOT NULL DEFAULT 0,
  calories_goal NUMERIC NOT NULL DEFAULT 2100,
  protein_consumed NUMERIC DEFAULT 0,
  protein_goal NUMERIC DEFAULT 140,
  carbs_consumed NUMERIC DEFAULT 0,
  carbs_goal NUMERIC DEFAULT 200,
  fat_consumed NUMERIC DEFAULT 0,
  fat_goal NUMERIC DEFAULT 60,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, log_date)
);

ALTER TABLE public.daily_nutrition_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own nutrition logs"
  ON public.daily_nutrition_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own nutrition logs"
  ON public.daily_nutrition_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own nutrition logs"
  ON public.daily_nutrition_logs FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);
